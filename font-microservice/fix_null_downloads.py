"""
fix_null_downloads.py — One-time patch for existing fonts with NULL download_count

The Python ingester bypassed Drizzle's .default(0) so new fonts got NULL
instead of 0. This causes the ORDER BY expression to fail and shows
"Transmission Error" on the home page.

Run once:
  python fix_null_downloads.py

Requirements: pip install psycopg2-binary python-dotenv
"""
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.environ.get("DATABASE_URL", "")

if not DB_URL:
    print("ERROR: DATABASE_URL not set in .env")
    exit(1)

conn = psycopg2.connect(DB_URL)
with conn.cursor() as cur:
    cur.execute("SELECT COUNT(*) FROM fonts WHERE download_count IS NULL")
    null_count = cur.fetchone()[0]
    print(f"Found {null_count} fonts with NULL download_count")

    if null_count > 0:
        cur.execute("UPDATE fonts SET download_count = 0 WHERE download_count IS NULL")
        print(f"✓ Fixed {null_count} rows — set download_count = 0")
    else:
        print("✓ Nothing to fix — all rows already have download_count set")

conn.commit()
conn.close()
print("Done. Restart your server to clear the error.")
