import os
from dotenv import load_dotenv
import psycopg

load_dotenv('..\\.env')
DB=os.environ.get('DATABASE_URL')
print('DB set:', bool(DB))
with psycopg.connect(DB) as conn:
    with conn.cursor() as cur:
        cur.execute('select user_id, subscription_expires_at, registered_date from users where user_id = %s', (1109421300,))
        print('row:', cur.fetchone())
