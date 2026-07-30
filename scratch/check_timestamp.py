import sys
sys.path.append('backend')
# pyrefly: ignore [missing-import]
from utils.db import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    row = db.execute(text("SELECT id, name, ranking, created_at FROM universities WHERE name = 'The University of Melbourne'")).fetchone()
    print("Melbourne Row:", row)
finally:
    db.close()
