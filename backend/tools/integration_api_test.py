import asyncio
import json
import os
import sys
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

import httpx


@dataclass
class CallResult:
    name: str
    method: str
    url: str
    status: Optional[int]
    ok: bool
    elapsed_ms: Optional[float]
    response_text: Optional[str]
    error: Optional[str]


def _join_url(base_url: str, path: str) -> str:
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return base_url.rstrip("/") + "/" + path.lstrip("/")


def _iso_date(d: date) -> str:
    return d.isoformat()


def _trim(text: str, limit: int = 4000) -> str:
    text = text or ""
    if len(text) <= limit:
        return text
    return text[:limit] + "\n…(truncated)…"


async def _call(
    client: httpx.AsyncClient,
    *,
    name: str,
    method: str,
    url: str,
    expected: Optional[set[int]] = None,
    allow_any_2xx: bool = False,
    **kwargs: Any,
) -> CallResult:
    start = time.perf_counter()
    status: Optional[int] = None
    response_text: Optional[str] = None
    error: Optional[str] = None
    ok = False

    try:
        resp = await client.request(method, url, **kwargs)
        status = resp.status_code
        try:
            response_text = resp.text
        except Exception:
            response_text = None

        if allow_any_2xx:
            ok = 200 <= status < 300
        elif expected is None:
            ok = status == 200
        else:
            ok = status in expected

        return CallResult(
            name=name,
            method=method,
            url=url,
            status=status,
            ok=ok,
            elapsed_ms=round((time.perf_counter() - start) * 1000, 2),
            response_text=_trim(response_text or ""),
            error=None,
        )
    except Exception as e:
        error = f"{type(e).__name__}: {e}"
        return CallResult(
            name=name,
            method=method,
            url=url,
            status=status,
            ok=False,
            elapsed_ms=round((time.perf_counter() - start) * 1000, 2),
            response_text=response_text,
            error=error,
        )


async def main() -> int:
    base_url = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
    api_prefix = os.getenv("API_PREFIX", "/api/v1")
    timeout_s = float(os.getenv("API_TIMEOUT", "60"))

    workspace_root = Path(__file__).resolve().parents[2]
    out_dir = workspace_root / "docs"
    out_dir.mkdir(parents=True, exist_ok=True)
    report_path = out_dir / "api_integration_report.jsonl"
    summary_path = out_dir / "api_integration_report.txt"

    telegram_chat_id = os.getenv("TEST_TELEGRAM_CHAT_ID")
    if not telegram_chat_id:
        # BigInt-safe unique-ish id for local testing
        telegram_chat_id = str(99_000_000_000 + (int(time.time() * 1000) % 1_000_000_000))

    test_tag = os.getenv("TEST_TAG", datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"))

    results: list[CallResult] = []
    artifacts: dict[str, Any] = {}

    async with httpx.AsyncClient(timeout=timeout_s) as client:
        # Basic health
        results.append(
            await _call(
                client,
                name="health",
                method="GET",
                url=_join_url(base_url, "/health"),
                expected={200},
            )
        )

        # Auth
        auth_payload = {
            "telegram_chat_id": telegram_chat_id,
            "username": f"api_test_{test_tag}",
            "first_name": "API",
            "last_name": "Test",
            "language_code": "ru",
        }
        auth_res = await _call(
            client,
            name="auth.telegram",
            method="POST",
            url=_join_url(base_url, f"{api_prefix}/auth/telegram"),
            expected={200},
            json=auth_payload,
        )
        results.append(auth_res)

        token: Optional[str] = None
        if auth_res.ok:
            try:
                token = json.loads(auth_res.response_text or "{}").get("access_token")
            except Exception:
                token = None

        if not token:
            # Can't proceed with authenticated tests
            _write_reports(report_path, summary_path, results)
            return 2

        auth_headers = {"Authorization": f"Bearer {token}"}

        # /me
        results.append(
            await _call(
                client,
                name="auth.me",
                method="GET",
                url=_join_url(base_url, f"{api_prefix}/auth/me"),
                expected={200},
                headers=auth_headers,
            )
        )

        # Categories CRUD
        exp_cat_name = f"Test Expense {test_tag}"
        inc_cat_name = f"Test Income {test_tag}"

        results.append(
            await _call(
                client,
                name="categories.public.expenses",
                method="GET",
                url=_join_url(base_url, f"{api_prefix}/categories/public/expenses"),
                expected={200},
            )
        )

        results.append(
            await _call(
                client,
                name="categories.all",
                method="GET",
                url=_join_url(base_url, f"{api_prefix}/categories/all"),
                expected={200},
                headers=auth_headers,
            )
        )

        exp_cat_id = await _create_category(
            client,
            results,
            base_url,
            api_prefix,
            auth_headers,
            name=exp_cat_name,
            type_="expense",
        )
        inc_cat_id = await _create_category(
            client,
            results,
            base_url,
            api_prefix,
            auth_headers,
            name=inc_cat_name,
            type_="income",
        )
        artifacts["expense_category"] = {"id": exp_cat_id, "name": exp_cat_name}
        artifacts["income_category"] = {"id": inc_cat_id, "name": inc_cat_name}

        if exp_cat_id:
            results.append(
                await _call(
                    client,
                    name="categories.update.expense",
                    method="PUT",
                    url=_join_url(base_url, f"{api_prefix}/categories/{exp_cat_id}"),
                    expected={200},
                    headers=auth_headers,
                    json={"icon": "🧪"},
                )
            )

        # Expenses CRUD
        expense_id = await _create_expense(
            client,
            results,
            base_url,
            api_prefix,
            auth_headers,
            category=exp_cat_name,
            tag=test_tag,
        )
        artifacts["expense_id"] = expense_id

        # Income CRUD
        income_id = await _create_income(
            client,
            results,
            base_url,
            api_prefix,
            auth_headers,
            category=inc_cat_name,
            tag=test_tag,
        )
        artifacts["income_id"] = income_id

        # Budget CRUD
        month = datetime.now().strftime("%Y-%m")
        artifacts["budget_month"] = month

        results.append(
            await _call(
                client,
                name="budget.create",
                method="POST",
                url=_join_url(base_url, f"{api_prefix}/budget"),
                expected={200, 201},
                headers=auth_headers,
                json={"month": month, "budget_amount": 12345, "currency": "KGS"},
            )
        )
        results.append(
            await _call(
                client,
                name="budget.get",
                method="GET",
                url=_join_url(base_url, f"{api_prefix}/budget/{month}"),
                expected={200},
                headers=auth_headers,
            )
        )
        results.append(
            await _call(
                client,
                name="budget.current.status",
                method="GET",
                url=_join_url(base_url, f"{api_prefix}/budget/current/status"),
                expected={200},
                headers=auth_headers,
            )
        )
        results.append(
            await _call(
                client,
                name="budget.month.status",
                method="GET",
                url=_join_url(base_url, f"{api_prefix}/budget/{month}/status"),
                expected={200},
                headers=auth_headers,
            )
        )
        results.append(
            await _call(
                client,
                name="budget.update",
                method="PUT",
                url=_join_url(base_url, f"{api_prefix}/budget/{month}"),
                expected={200},
                headers=auth_headers,
                json={"budget_amount": 22222},
            )
        )

        # Goals CRUD + contribute
        goal_id = await _create_goal(
            client,
            results,
            base_url,
            api_prefix,
            auth_headers,
            tag=test_tag,
        )
        artifacts["goal_id"] = goal_id

        if goal_id:
            results.append(
                await _call(
                    client,
                    name="goals.contribute.deposit",
                    method="POST",
                    url=_join_url(base_url, f"{api_prefix}/goals/{goal_id}/contribute"),
                    expected={200},
                    headers=auth_headers,
                    json={"amount": 100, "type": "deposit", "note": "test deposit", "source": "manual"},
                )
            )
            results.append(
                await _call(
                    client,
                    name="goals.update",
                    method="PUT",
                    url=_join_url(base_url, f"{api_prefix}/goals/{goal_id}"),
                    expected={200},
                    headers=auth_headers,
                    json={"description": "updated by integration test"},
                )
            )

        # Recurring CRUD + mark-paid
        recurring_id = await _create_recurring(
            client,
            results,
            base_url,
            api_prefix,
            auth_headers,
            category=exp_cat_name,
            tag=test_tag,
        )
        artifacts["recurring_id"] = recurring_id

        if recurring_id:
            results.append(
                await _call(
                    client,
                    name="recurring.mark_paid",
                    method="POST",
                    url=_join_url(base_url, f"{api_prefix}/recurring/{recurring_id}/mark-paid"),
                    expected={200},
                    headers=auth_headers,
                    json={"create_expense": True},
                )
            )
            results.append(
                await _call(
                    client,
                    name="recurring.delete",
                    method="DELETE",
                    url=_join_url(base_url, f"{api_prefix}/recurring/{recurring_id}"),
                    expected={200},
                    headers=auth_headers,
                )
            )

        # Debts CRUD + payment
        debt_id = await _create_debt(
            client,
            results,
            base_url,
            api_prefix,
            auth_headers,
            tag=test_tag,
        )
        artifacts["debt_id"] = debt_id

        if debt_id:
            results.append(
                await _call(
                    client,
                    name="debts.payment",
                    method="POST",
                    url=_join_url(base_url, f"{api_prefix}/debts/{debt_id}/payments"),
                    expected={200},
                    headers=auth_headers,
                    json={"amount": 50, "note": "test payment", "create_transaction": False},
                )
            )
            results.append(
                await _call(
                    client,
                    name="debts.delete",
                    method="DELETE",
                    url=_join_url(base_url, f"{api_prefix}/debts/{debt_id}"),
                    expected={200},
                    headers=auth_headers,
                )
            )

        # Cleanup
        if expense_id:
            results.append(
                await _call(
                    client,
                    name="expenses.delete",
                    method="DELETE",
                    url=_join_url(base_url, f"{api_prefix}/expenses/{expense_id}"),
                    expected={200},
                    headers=auth_headers,
                )
            )
        if income_id:
            results.append(
                await _call(
                    client,
                    name="income.delete",
                    method="DELETE",
                    url=_join_url(base_url, f"{api_prefix}/income/{income_id}"),
                    expected={200},
                    headers=auth_headers,
                )
            )
        if goal_id:
            results.append(
                await _call(
                    client,
                    name="goals.delete",
                    method="DELETE",
                    url=_join_url(base_url, f"{api_prefix}/goals/{goal_id}"),
                    expected={204},
                    headers=auth_headers,
                )
            )

        if exp_cat_id:
            results.append(
                await _call(
                    client,
                    name="categories.delete.expense",
                    method="DELETE",
                    url=_join_url(base_url, f"{api_prefix}/categories/{exp_cat_id}"),
                    expected={200},
                    headers=auth_headers,
                )
            )
        if inc_cat_id:
            results.append(
                await _call(
                    client,
                    name="categories.delete.income",
                    method="DELETE",
                    url=_join_url(base_url, f"{api_prefix}/categories/{inc_cat_id}"),
                    expected={200},
                    headers=auth_headers,
                )
            )

        results.append(
            await _call(
                client,
                name="budget.delete",
                method="DELETE",
                url=_join_url(base_url, f"{api_prefix}/budget/{month}"),
                expected={200},
                headers=auth_headers,
            )
        )

        # Reports (may fail if APITemplate not configured)
        results.append(
            await _call(
                client,
                name="reports.weekly",
                method="POST",
                url=_join_url(base_url, f"{api_prefix}/reports/weekly"),
                expected={200},
                headers=auth_headers,
                json={"report_type": "weekly"},
            )
        )

    _write_reports(report_path, summary_path, results)

    failed = [r for r in results if not r.ok]
    # Exit code signals CI/scripting; 0 only when everything expected passed.
    return 0 if not failed else 1


async def _create_category(
    client: httpx.AsyncClient,
    results: list[CallResult],
    base_url: str,
    api_prefix: str,
    headers: dict[str, str],
    *,
    name: str,
    type_: str,
) -> Optional[int]:
    res = await _call(
        client,
        name=f"categories.create.{type_}",
        method="POST",
        url=_join_url(base_url, f"{api_prefix}/categories/"),
        expected={200, 201},
        headers=headers,
        json={"name": name, "type": type_, "icon": "🧪", "color": "#6B7280"},
    )
    results.append(res)
    if not res.ok:
        return None
    try:
        return int(json.loads(res.response_text or "{}")["id"])
    except Exception:
        return None


async def _create_expense(
    client: httpx.AsyncClient,
    results: list[CallResult],
    base_url: str,
    api_prefix: str,
    headers: dict[str, str],
    *,
    category: str,
    tag: str,
) -> Optional[int]:
    payload = {
        "amount": 123.45,
        "currency": "KGS",
        "category": category,
        "description": f"integration expense {tag}",
        "date": _iso_date(date.today()),
    }
    res = await _call(
        client,
        name="expenses.create",
        method="POST",
        url=_join_url(base_url, f"{api_prefix}/expenses"),
        expected={201},
        headers=headers,
        json=payload,
    )
    results.append(res)
    if not res.ok:
        return None
    try:
        expense_id = int(json.loads(res.response_text or "{}")["id"])
    except Exception:
        expense_id = None

    results.append(
        await _call(
            client,
            name="expenses.list",
            method="GET",
            url=_join_url(base_url, f"{api_prefix}/expenses?page=1&page_size=10"),
            expected={200},
            headers=headers,
        )
    )
    if expense_id:
        results.append(
            await _call(
                client,
                name="expenses.get",
                method="GET",
                url=_join_url(base_url, f"{api_prefix}/expenses/{expense_id}"),
                expected={200},
                headers=headers,
            )
        )
        results.append(
            await _call(
                client,
                name="expenses.update",
                method="PUT",
                url=_join_url(base_url, f"{api_prefix}/expenses/{expense_id}"),
                expected={200},
                headers=headers,
                json={"description": "updated"},
            )
        )

    return expense_id


async def _create_income(
    client: httpx.AsyncClient,
    results: list[CallResult],
    base_url: str,
    api_prefix: str,
    headers: dict[str, str],
    *,
    category: str,
    tag: str,
) -> Optional[int]:
    payload = {
        "amount": 999.0,
        "currency": "KGS",
        "category": category,
        "description": f"integration income {tag}",
        "date": _iso_date(date.today()),
    }
    res = await _call(
        client,
        name="income.create",
        method="POST",
        url=_join_url(base_url, f"{api_prefix}/income"),
        expected={201},
        headers=headers,
        json=payload,
    )
    results.append(res)
    if not res.ok:
        return None
    try:
        income_id = int(json.loads(res.response_text or "{}")["id"])
    except Exception:
        income_id = None

    results.append(
        await _call(
            client,
            name="income.list",
            method="GET",
            url=_join_url(base_url, f"{api_prefix}/income?page=1&page_size=10"),
            expected={200},
            headers=headers,
        )
    )
    if income_id:
        results.append(
            await _call(
                client,
                name="income.get",
                method="GET",
                url=_join_url(base_url, f"{api_prefix}/income/{income_id}"),
                expected={200},
                headers=headers,
            )
        )
        results.append(
            await _call(
                client,
                name="income.update",
                method="PUT",
                url=_join_url(base_url, f"{api_prefix}/income/{income_id}"),
                expected={200},
                headers=headers,
                json={"description": "updated"},
            )
        )

    return income_id


async def _create_goal(
    client: httpx.AsyncClient,
    results: list[CallResult],
    base_url: str,
    api_prefix: str,
    headers: dict[str, str],
    *,
    tag: str,
) -> Optional[int]:
    results.append(
        await _call(
            client,
            name="goals.list",
            method="GET",
            url=_join_url(base_url, f"{api_prefix}/goals"),
            expected={200},
            headers=headers,
        )
    )

    payload = {
        "name": f"Goal {tag}",
        "description": "integration test",
        "target_amount": 1000,
        "initial_amount": 10,
        "currency": "KGS",
        "icon": "🎯",
        "color": "#6366F1",
        "deadline": (date.today() + timedelta(days=30)).isoformat(),
        "auto_contribute": False,
    }
    res = await _call(
        client,
        name="goals.create",
        method="POST",
        url=_join_url(base_url, f"{api_prefix}/goals"),
        expected={201},
        headers=headers,
        json=payload,
    )
    results.append(res)
    if not res.ok:
        return None

    try:
        goal_id = int(json.loads(res.response_text or "{}")["id"])
    except Exception:
        goal_id = None

    if goal_id:
        results.append(
            await _call(
                client,
                name="goals.get",
                method="GET",
                url=_join_url(base_url, f"{api_prefix}/goals/{goal_id}"),
                expected={200},
                headers=headers,
            )
        )

    return goal_id


async def _create_recurring(
    client: httpx.AsyncClient,
    results: list[CallResult],
    base_url: str,
    api_prefix: str,
    headers: dict[str, str],
    *,
    category: str,
    tag: str,
) -> Optional[int]:
    results.append(
        await _call(
            client,
            name="recurring.list",
            method="GET",
            url=_join_url(base_url, f"{api_prefix}/recurring"),
            expected={200},
            headers=headers,
        )
    )

    payload = {
        "title": f"Recurring {tag}",
        "amount": 77,
        "currency": "KGS",
        "category": category,
        "description": "integration recurring",
        "transaction_type": "expense",
        "frequency": "monthly",
        "interval_value": 1,
        "next_payment_date": (date.today() + timedelta(days=1)).isoformat(),
        "remind_days_before": 1,
        "auto_create": False,
    }
    res = await _call(
        client,
        name="recurring.create",
        method="POST",
        url=_join_url(base_url, f"{api_prefix}/recurring"),
        expected={200, 201},
        headers=headers,
        json=payload,
    )
    results.append(res)
    if not res.ok:
        return None

    try:
        recurring_id = int(json.loads(res.response_text or "{}")["id"])
    except Exception:
        recurring_id = None

    if recurring_id:
        results.append(
            await _call(
                client,
                name="recurring.get",
                method="GET",
                url=_join_url(base_url, f"{api_prefix}/recurring/{recurring_id}"),
                expected={200},
                headers=headers,
            )
        )
        results.append(
            await _call(
                client,
                name="recurring.update",
                method="PUT",
                url=_join_url(base_url, f"{api_prefix}/recurring/{recurring_id}"),
                expected={200},
                headers=headers,
                json={"description": "updated"},
            )
        )

    return recurring_id


async def _create_debt(
    client: httpx.AsyncClient,
    results: list[CallResult],
    base_url: str,
    api_prefix: str,
    headers: dict[str, str],
    *,
    tag: str,
) -> Optional[int]:
    results.append(
        await _call(
            client,
            name="debts.list",
            method="GET",
            url=_join_url(base_url, f"{api_prefix}/debts/"),
            expected={200},
            headers=headers,
        )
    )

    payload = {
        "person_name": f"Person {tag}",
        "debt_type": "given",
        "original_amount": 150,
        "currency": "KGS",
        "description": "integration debt",
        "due_date": (date.today() + timedelta(days=10)).isoformat(),
        "remind_before_days": 3,
    }
    res = await _call(
        client,
        name="debts.create",
        method="POST",
        url=_join_url(base_url, f"{api_prefix}/debts/"),
        expected={200},
        headers=headers,
        json=payload,
    )
    results.append(res)
    if not res.ok:
        return None

    try:
        debt_id = int(json.loads(res.response_text or "{}")["id"])
    except Exception:
        debt_id = None

    if debt_id:
        results.append(
            await _call(
                client,
                name="debts.get",
                method="GET",
                url=_join_url(base_url, f"{api_prefix}/debts/{debt_id}"),
                expected={200},
                headers=headers,
            )
        )
        results.append(
            await _call(
                client,
                name="debts.update",
                method="PUT",
                url=_join_url(base_url, f"{api_prefix}/debts/{debt_id}"),
                expected={200},
                headers=headers,
                json={"description": "updated"},
            )
        )

    return debt_id


def _write_reports(report_path: Path, summary_path: Path, results: list[CallResult]) -> None:
    with report_path.open("w", encoding="utf-8") as f:
        for r in results:
            f.write(
                json.dumps(
                    {
                        "name": r.name,
                        "method": r.method,
                        "url": r.url,
                        "status": r.status,
                        "ok": r.ok,
                        "elapsed_ms": r.elapsed_ms,
                        "error": r.error,
                        "response_text": r.response_text,
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )

    total = len(results)
    passed = sum(1 for r in results if r.ok)
    failed = total - passed

    lines: list[str] = []
    lines.append(f"API integration report")
    lines.append(f"Total: {total} | Passed: {passed} | Failed: {failed}")
    lines.append("")

    for r in results:
        if r.ok:
            continue
        lines.append(f"FAIL {r.name}: {r.method} {r.url} -> {r.status}")
        if r.error:
            lines.append(f"  error: {r.error}")
        if r.response_text:
            lines.append("  response:")
            for line in (r.response_text or "").splitlines()[:40]:
                lines.append(f"    {line}")
            if len((r.response_text or "").splitlines()) > 40:
                lines.append("    …(truncated lines)…")
        lines.append("")

    summary_path.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    try:
        raise SystemExit(asyncio.run(main()))
    except KeyboardInterrupt:
        raise SystemExit(130)
