from sqlalchemy import create_engine, text
import os
from datetime import datetime, timedelta

# Load DATABASE_URL from .env if not set
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
    DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    raise SystemExit('DATABASE_URL not set')

# Convert SQLAlchemy+asyncpg URL to sync postgres url for create_engine
if DATABASE_URL.startswith('postgresql+asyncpg://'):
    sync_url = DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
else:
    sync_url = DATABASE_URL

engine = create_engine(sync_url)

user_id = 999999999002
new_expiry = datetime.utcnow() - timedelta(days=1)

with engine.begin() as conn:
    conn.execute(text("UPDATE users SET subscription_expires_at = :expiry WHERE user_id = :uid"), {"expiry": new_expiry, "uid": user_id})
    print('Updated user', user_id, 'expiry to', new_expiry.isoformat())