import sys
sys.path.insert(0, 'd:/office/backend')
from utils.db import SessionLocal
from sqlalchemy import text

db = SessionLocal()

# Find remaining fake .edu URLs
rows = db.execute(text("SELECT id, name, website FROM universities WHERE website LIKE '%.edu' ORDER BY ranking ASC")).fetchall()
print(f"Remaining fake .edu URLs: {len(rows)}")
for r in rows:
    print(f"  ID={r[0]}  {r[1]} -> {r[2]}")

# Manual fixes for known universities still wrong
manual_fixes = {
    "UCL": "https://www.ucl.ac.uk",
    "University College London": "https://www.ucl.ac.uk",
    "London School of Economics": "https://www.lse.ac.uk",
    "King's College London": "https://www.kcl.ac.uk",
    "University of Edinburgh": "https://www.ed.ac.uk",
    "Kyoto University": "https://www.kyoto-u.ac.jp",
    "Osaka University": "https://www.osaka-u.ac.jp",
    "Delft University of Technology": "https://www.tudelft.nl",
    "University of Amsterdam": "https://www.uva.nl",
    "KU Leuven": "https://www.kuleuven.be",
    "University of Queensland": "https://www.uq.edu.au",
    "University of British Columbia": "https://www.ubc.ca",
    "Fudan University": "https://www.fudan.edu.cn",
    "Zhejiang University": "https://www.zju.edu.cn",
    "Shanghai Jiao Tong University": "https://www.sjtu.edu.cn",
    "Ludwig Maximilian University": "https://www.lmu.de",
    "Heidelberg University": "https://www.uni-heidelberg.de",
    "Lund University": "https://www.lu.se",
    "Utrecht University": "https://www.uu.nl",
    "University of Copenhagen": "https://www.ku.dk",
    "Karolinska Institute": "https://ki.se",
    "KAIST": "https://www.kaist.ac.kr",
    "Hong Kong University of Science": "https://www.ust.hk",
    "Chinese University of Hong Kong": "https://www.cuhk.edu.hk",
}

updated = 0
for univ_id, name, url in rows:
    for key, correct_url in manual_fixes.items():
        if key.lower() in name.lower():
            db.execute(text("UPDATE universities SET website = :url WHERE id = :id"), {"url": correct_url, "id": univ_id})
            print(f"Fixed: {name} -> {correct_url}")
            updated += 1
            break

db.commit()
db.close()
print(f"\nFixed {updated} remaining universities.")
