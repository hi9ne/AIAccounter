import asyncio
from pathlib import Path
from dotenv import load_dotenv
import os

# Load env
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

async def main():
    dsn = os.environ.get("DATABASE_URL", "").strip().strip('"').strip("'")
    if not dsn:
        print("DATABASE_URL not set")
        return
    
    engine = create_async_engine(dsn, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute(
            text("SELECT id, report_type, title, format, created_at FROM saved_reports ORDER BY created_at DESC LIMIT 10")
        )
        print("Recent saved_reports:")
        print("ID | Type | Format | Title")
        print("-" * 80)
        for r in result:
            print(f"{r[0]} | {r[1]} | {r[3]} | {r[2]}")

if __name__ == "__main__":
    asyncio.run(main())
