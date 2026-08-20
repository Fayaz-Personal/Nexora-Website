"""
Reset passwords for admin, business, and uni_admin accounts.
Run: python backend/scripts/reset_passwords.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bcrypt
from utils.db import SessionLocal
from sqlalchemy import text

# New passwords to set
RESETS = [
    ("admin@nexora.com",       "Admin@123",    "platform_admin"),
    ("red@gmail.com",          "Business@123", "business"),
    ("buzz@gmail.com",         "Business@123", "business"),
    ("xyz@gmail.com",          "UniAdmin@123", "uni_admin"),
    ("abc@gmail.com",          "UniAdmin@123", "uni_admin"),
]

def reset():
    db = SessionLocal()
    try:
        for email, new_password, role in RESETS:
            hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            result = db.execute(
                text("UPDATE users SET password_hash = :h WHERE email = :e"),
                {"h": hashed, "e": email}
            )
            if result.rowcount > 0:
                print(f"[OK] {role:15} | {email:35} | New password: {new_password}")
            else:
                print(f"[NOT FOUND] {email}")
        db.commit()
        print("\nAll passwords reset successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset()
