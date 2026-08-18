import sys
sys.path.insert(0, 'd:/office/backend')
from utils.db import SessionLocal
from sqlalchemy import text

db = SessionLocal()
db.execute(text("UPDATE universities SET website = 'https://www.ucla.edu' WHERE name ILIKE '%UCLA%' OR name ILIKE '%Los Angeles%'"))
db.commit()
rows = db.execute(text("SELECT name, website FROM universities WHERE name ILIKE '%UCLA%' OR name ILIKE '%Los Angeles%'")).fetchall()
for r in rows:
    print(r[0], '->', r[1])
db.close()
