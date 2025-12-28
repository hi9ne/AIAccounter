import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv('..\\.env')
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL.startswith('postgresql+asyncpg://'):
    sync_url = DATABASE_URL.replace('postgresql+asyncpg://', 'postgresql://')
else:
    sync_url = DATABASE_URL
engine = create_engine(sync_url)
user_id = 1109421300
new_expiry = datetime.utcnow() - timedelta(days=1)
with engine.begin() as conn:
    conn.execute(text("UPDATE users SET subscription_expires_at = :expiry WHERE user_id = :uid"), {"expiry": new_expiry, "uid": user_id})
    print('Updated user', user_id, 'expiry to', new_expiry.isoformat())