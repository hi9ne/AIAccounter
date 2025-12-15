"""Apply migration 006_fix_cleanup_embeddings_trigger.sql to the configured database."""

import asyncio
import sys
from pathlib import Path

from sqlalchemy import text

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.database import engine

MIGRATION_PATH = BACKEND_DIR / "migrations" / "006_fix_cleanup_embeddings_trigger.sql"


async def main() -> None:
    sql = MIGRATION_PATH.read_text(encoding="utf-8")
    async with engine.begin() as conn:
        await conn.execute(text(sql))


if __name__ == "__main__":
    asyncio.run(main())
