from __future__ import annotations

import sys
from pathlib import Path

from dotenv import load_dotenv
import os
import psycopg


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: db_describe_table.py <table>")
        return 2

    table = sys.argv[1]

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    dsn = os.environ.get("DATABASE_URL", "").strip().strip('"').strip("'")
    if not dsn:
        print("DATABASE_URL is not set")
        return 2

    dsn = dsn.replace("postgresql+asyncpg://", "postgresql://")

    q = (
        "SELECT column_name, data_type, udt_name, is_nullable, column_default "
        "FROM information_schema.columns "
        "WHERE table_schema='public' AND table_name=%s "
        "ORDER BY ordinal_position"
    )

    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(q, (table,))
            rows = cur.fetchall()

    for r in rows:
        print(r)

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
