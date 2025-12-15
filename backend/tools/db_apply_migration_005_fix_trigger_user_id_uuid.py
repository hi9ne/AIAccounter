"""Apply migration 005_fix_trigger_user_id_uuid.sql to the configured database.

This avoids restarting the running API server by patching only DB functions.
"""

import asyncio
import sys
from pathlib import Path

from sqlalchemy import text

# Ensure `backend/` is on sys.path so `import app.*` works
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.database import engine


MIGRATION_PATH = Path(__file__).resolve().parents[1] / "migrations" / "005_fix_trigger_user_id_uuid.sql"


def _split_sql_statements(sql: str) -> list[str]:
    """Very small splitter safe for our file: executes each CREATE OR REPLACE FUNCTION block as one stmt."""

    # We keep it simple: the file contains two CREATE OR REPLACE FUNCTION statements.
    chunks = []
    current = []
    for line in sql.splitlines():
        if line.strip().startswith("--"):
            continue
        current.append(line)

    normalized = "\n".join(current).strip()
    # Split on ';\n\n' between statements (functions end with '$function$;')
    parts = [p.strip() for p in normalized.split("$function$;") if p.strip()]
    statements = [p + "\n$function$;" for p in parts]
    return statements


async def main() -> None:
    sql = MIGRATION_PATH.read_text(encoding="utf-8")
    statements = _split_sql_statements(sql)

    async with engine.begin() as conn:
        for stmt in statements:
            await conn.execute(text(stmt))


if __name__ == "__main__":
    asyncio.run(main())
