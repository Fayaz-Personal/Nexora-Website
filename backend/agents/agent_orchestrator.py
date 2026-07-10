import os
import json
import logging
import hashlib
from typing import Dict, Any, Optional
import google.generativeai as genai
from groq import Groq
from sqlalchemy import text
from sqlalchemy.orm import Session
from utils.db import SessionLocal
from utils.models import PendingUpdate, AIActivityLog, SecurityAuditLog, University
from utils.validation import validate_update

logger = logging.getLogger("AgentOrchestrator")

def get_api_key(key_name: str) -> Optional[str]:
    # Check OS env first
    val = os.environ.get(key_name)
    if val:
        return val
    # Check parent .env.local
    env_local_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env.local')
    if os.path.exists(env_local_path):
        with open(env_local_path, 'r') as f:
            for line in f:
                if line.startswith(f"{key_name}="):
                    val = line.split('=', 1)[1].strip()
                    if val.startswith('"') or val.startswith("'"):
                        val = val[1:-1]
                    return val
    return None

GEMINI_API_KEY = get_api_key('GEMINI_API_KEY')
GROQ_API_KEY = get_api_key('GROQ_API_KEY')

def call_llm(prompt: str) -> str:
    """Call Gemini or Groq to process text and return response."""
    # Try Gemini first
    if GEMINI_API_KEY:
        try:
            logger.info("Calling Gemini API...")
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}")

    # Fallback to Groq
    if GROQ_API_KEY:
        try:
            logger.info("Calling Groq API...")
            client = Groq(api_key=GROQ_API_KEY)
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "user", "content": prompt}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.1
            )
            return chat_completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Groq API call failed: {e}")

    # Ultimate mock fallback if no API keys are configured
    logger.warning("No working LLM key found or APIs failed. Using local rule parser fallback.")
    return "{}"

def extract_structured_data(text_content: str, target_schema_desc: str, instructions: str) -> Dict[str, Any]:
    """Instructs LLM to structure scraper textual content into a valid JSON object."""
    prompt = f"""
You are an expert AI data extraction agent. Analyze the text below and extract relevant fields.
Produce ONLY a valid raw JSON object. Do NOT include markdown tags, code blocks, or explanations.
If a field is not found in the text, omit it or set it to null.

Instructions: {instructions}
Target JSON Schema Description:
{target_schema_desc}

Text Content to Extract:
\"\"\"
{text_content}
\"\"\"
"""
    response_text = call_llm(prompt)
    
    # Strip markdown code fencing if the LLM returned it anyway
    if response_text.startswith("```"):
        # Remove first line
        lines = response_text.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines[-1].startswith("```"):
            lines = lines[:-1]
        response_text = "\n".join(lines).strip()
        
    try:
        data = json.loads(response_text)
        return data
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response as JSON: {response_text}. Error: {e}")
        return {}

def is_university_partner_managed(db: Session, university_id: int) -> bool:
    """Check if the university has a registered university admin (partner)."""
    # Check if there is an entry in uni_admin_profiles table
    # Since uni_admin_profiles is a table, we query it dynamically
    sql = "SELECT id FROM uni_admin_profiles WHERE university_id = :univ_id LIMIT 1"
    res = db.execute(text(sql), {"univ_id": university_id}).fetchone()
    return res is not None

def process_scraped_data(
    table_name: str, 
    identifier_key: str, 
    identifier_value: str, 
    new_data: Dict[str, Any]
) -> bool:
    """
    Validates the new scraped details, checks the database for existing entries, 
    and inserts a pending update record if changes are detected.
    """
    db = SessionLocal()
    try:
        # 1. Fetch existing record (if any)
        # Select using raw SQL parameters via connection
        sql = f"SELECT * FROM {table_name} WHERE {identifier_key} = :val LIMIT 1"
        existing_record = db.execute(text(sql), {"val": identifier_value}).fetchone()
        
        old_data = None
        record_id = None
        
        if existing_record:
            record_id = existing_record.id
            old_data = dict(existing_record._mapping)
            # Remove datetime objects and decimal types for clean JSON comparisons
            for k, v in list(old_data.items()):
                if hasattr(v, 'isoformat'): # date/datetime
                    old_data[k] = str(v)
                elif hasattr(v, 'to_eng_string') or type(v).__name__ == 'Decimal': # Numeric/Decimal
                    old_data[k] = float(v)

        # If it's a university, check partner verification rules
        if table_name == 'universities' and record_id:
            if is_university_partner_managed(db, record_id):
                logger.info(f"University '{identifier_value}' is partner-managed. AI proposals will NOT auto-overwrite info.")
                # We can still add updates to the queue but mark them clearly or skip. Let's proceed to queue them for admin approval.

        # 2. Validate update
        is_valid, confidence_score, flagged_suspicious, issues, sanitized_data = validate_update(
            table_name, new_data, old_data
        )
        
        if not is_valid:
            logger.warning(f"Validation failed for update to '{identifier_value}': {issues}")
            return False

        # 3. Check for actual changes
        has_changes = False
        if old_data:
            for key, val in sanitized_data.items():
                if key in old_data:
                    # Compare float/strings cleanly
                    old_val = old_data[key]
                    new_val = val
                    if isinstance(old_val, float) and (isinstance(new_val, int) or isinstance(new_val, float)):
                        if abs(old_val - float(new_val)) > 0.001:
                            has_changes = True
                    elif str(old_val) != str(new_val):
                        has_changes = True
        else:
            has_changes = True # Completely new entry

        if not has_changes:
            logger.info(f"No changes detected for '{identifier_value}' in table '{table_name}'. Skipping.")
            return False

        # 4. Insert into pending_updates
        pending = PendingUpdate(
            table_name=table_name,
            record_id=record_id,
            old_data=old_data,
            new_data=sanitized_data,
            confidence_score=confidence_score,
            status='pending'
        )
        db.add(pending)
        db.commit()
        
        # 5. Log Security Audit Log for AI Updates
        audit_desc = f"AI Agent generated pending update for {table_name}: '{identifier_value}'"
        if flagged_suspicious:
            audit_desc += " [FLAGGED SUSPICIOUS]"
        audit = SecurityAuditLog(
            event_type='ai_update',
            description=audit_desc,
            event_metadata={
                "table_name": table_name,
                "record_id": record_id,
                "confidence_score": float(confidence_score),
                "flagged_suspicious": flagged_suspicious,
                "issues": issues
            }
        )
        db.add(audit)
        db.commit()
        
        logger.info(f"Successfully added pending update for '{identifier_value}' with confidence {confidence_score}%")
        return True

    except Exception as e:
        logger.error(f"Error processing scraped data: {e}")
        db.rollback()
        return False
    finally:
        db.close()
