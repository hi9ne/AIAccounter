from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
import os
import psycopg


def main() -> int:
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")

    dsn = os.environ.get("DATABASE_URL", "").strip().strip('"').strip("'")
    if not dsn:
        print("DATABASE_URL is not set")
        return 2

    dsn = dsn.replace("postgresql+asyncpg://", "postgresql://")

    tables = ["expenses", "income", "debts"]

    query = (
        "SELECT event_object_table, trigger_name, action_timing, event_manipulation, action_statement "
        "FROM information_schema.triggers "
        "WHERE trigger_schema='public' AND event_object_table = ANY(%s) "
        "ORDER BY event_object_table, trigger_name"
    )

    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(query, (tables,))
            rows = cur.fetchall()

    for row in rows:
        print(row)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
