from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
import psycopg
import os


def main() -> int:
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")

    dsn = os.environ.get("DATABASE_URL", "").strip().strip('"').strip("'")
    if not dsn:
        print("DATABASE_URL is not set")
        return 2

    # psycopg expects a standard Postgres URL
    dsn = dsn.replace("postgresql+asyncpg://", "postgresql://")

    query_public = (
        "SELECT table_schema, table_name, column_name, data_type, udt_name "
        "FROM information_schema.columns "
        "WHERE table_schema='public' "
        "AND table_name IN ('users','expenses','income','debts','recurring_payments','budgets','categories') "
        "AND column_name IN ('user_id') "
        "ORDER BY table_name"
    )

    query_all_schemas = (
        "SELECT table_schema, table_name, column_name, data_type, udt_name "
        "FROM information_schema.columns "
        "WHERE table_name IN ('expenses','income','debts') "
        "AND column_name='user_id' "
        "ORDER BY table_name, table_schema"
    )

    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(query_public)
            rows_public = cur.fetchall()

            cur.execute(query_all_schemas)
            rows_all = cur.fetchall()

    print("public schema user_id types:")
    for row in rows_public:
        print(row)

    print("\nall schemas (expenses/income/debts) user_id types:")
    for row in rows_all:
        print(row)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
