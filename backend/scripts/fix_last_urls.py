import sys
sys.path.insert(0, 'd:/office/backend')
from utils.db import SessionLocal
from sqlalchemy import text

db = SessionLocal()

fixes = [
    ("Universite PSL", "https://www.psl.eu"),
    ("Universite psl", "https://www.psl.eu"),
    ("PSL", "https://www.psl.eu"),
    ("Institut Polytechnique de Paris", "https://www.ip-paris.fr"),
    ("UCLA", "https://www.ucla.edu"),
    ("Los Angeles", "https://www.ucla.edu"),
    ("Monash University", "https://www.monash.edu"),
    ("Caltech", "https://www.caltech.edu"),
]

rows = db.execute(text("SELECT id, name, website FROM universities ORDER BY ranking ASC")).fetchall()

updated = 0
for univ_id, name, url in rows:
    for keyword, correct_url in fixes:
        if keyword.lower() in name.lower() and url != correct_url:
            db.execute(text("UPDATE universities SET website = :url WHERE id = :id"), {"url": correct_url, "id": univ_id})
            print(f"Fixed: {name} -> {correct_url}")
            updated += 1
            break

db.commit()
db.close()
print(f"Total fixed: {updated}")
