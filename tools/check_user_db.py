import os
import psycopg

user_id = 999999999001

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    # try reading .env
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
    DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    raise SystemExit('DATABASE_URL not set')

with psycopg.connect(DATABASE_URL) as conn:
    with conn.cursor() as cur:
        cur.execute('SELECT user_id, subscription_expires_at, registered_date FROM users WHERE user_id = %s', (user_id,))
        row = cur.fetchone()
        print('DB row:', row)