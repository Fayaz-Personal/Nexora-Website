import sys
import os
import time
import json
import logging
import urllib.parse
from sqlalchemy import text

# Add parent directory to path so we can import modules from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db import SessionLocal
from utils.models import Country, University
from utils.validation import validate_update
from agents.agent_orchestrator import call_llm

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ScrapeTop50")

def extract_domain(url):
    """Extract domain name from URL for Clearbit logo API."""
    if not url:
        return None
    try:
        parsed = urllib.parse.urlparse(url)
        netloc = parsed.netloc or parsed.path
        if netloc.startswith("www."):
            netloc = netloc[4:]
        return netloc.split('/')[0]
    except Exception:
        return None

def enrich_university_details(uni_name, website, description):
    """Use LLM to generate detailed application procedures and eligibility requirements."""
    logger.info(f"Enriching details for {uni_name} via LLM...")
    prompt = f"""
    You are an expert academic admissions advisor. Generate the detailed application procedure and eligibility requirements for international students applying to the following university:
    University: {uni_name}
    Website: {website}
    Description: {description}

    Produce ONLY a valid raw JSON object. Do NOT include markdown tags, code blocks, or explanations.
    CRITICAL: Do not use unescaped double quotes (") inside the text values. If you need to write a quote, use single quotes ('). Ensure all newlines in string properties are escaped (\\n) or keep text on a single line.
    
    Return JSON format:
    {{
      "application_procedure": "A detailed, step-by-step description (at least 2 paragraphs) of how international students can apply to this university.",
      "eligibility_requirements": "A detailed explanation (at least 2 paragraphs) of the academic, language proficiency, and documentation requirements for international students."
    }}
    """
    
    try:
        response_text = call_llm(prompt)
        # Robustly extract JSON block
        start_idx = response_text.find('{')
        end_idx = response_text.rfind('}')
        if start_idx != -1 and end_idx != -1:
            json_str = response_text[start_idx:end_idx+1]
        else:
            json_str = response_text
        
        # Load with strict=False to allow unescaped newlines in JSON values
        data = json.loads(json_str, strict=False)
        return data
    except Exception as e:
        logger.error(f"Error enriching {uni_name}: {e}")
        # Return fallback details
        return {
            "application_procedure": f"To apply to {uni_name}, international students must submit an online application form through the official portal, upload academic transcripts, proof of English proficiency (TOEFL/IELTS), letters of recommendation, and a statement of purpose. Check the official website at {website} for deadline updates.",
            "eligibility_requirements": f"Applicants to {uni_name} must hold a high school diploma (for undergraduate courses) or a bachelor's degree (for postgraduate courses) with an outstanding academic record. Standardized test scores (SAT/ACT or GRE/GMAT) may be required depending on the course. Non-native speakers must demonstrate English proficiency."
        }

def run_seeding():
    logger.info("Starting Top 50 World Universities Seeding...")
    db = SessionLocal()
    
    # 1. Load parsed JSON
    json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'universities_parsed.json')
    if not os.path.exists(json_path):
        logger.error(f"universities_parsed.json not found at {json_path}!")
        return
        
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    countries_data = data.get('countries', [])
    universities_data = data.get('universities', [])
    
    logger.info(f"Loaded {len(countries_data)} countries and {len(universities_data)} universities from JSON.")
    
    # 2. Sync Countries
    logger.info("Syncing countries...")
    db_countries = db.query(Country).all()
    country_map = {c.name.lower().strip(): c for c in db_countries}
    
    for c_data in countries_data:
        c_name_lower = c_data['name'].lower().strip()
        if c_name_lower not in country_map:
            logger.info(f"Seeding missing country: {c_data['name']}")
            # Insert missing country
            new_country = Country(
                name=c_data['name'],
                code=c_data.get('code', 'XX')[:10],
                visa_info=f"Student Visa requirements for {c_data['name']}.",
                average_living_cost=c_data.get('average_living_cost', 1000.00),
                currency=c_data.get('currency', 'USD')[:10]
            )
            db.add(new_country)
            db.commit()
            db.refresh(new_country)
            country_map[c_name_lower] = new_country
            
    # 3. Filter top 50 universities
    top_50 = [u for u in universities_data if u.get('ranking') is not None and int(u['ranking']) <= 50]
    # Sort by rank
    top_50.sort(key=lambda u: int(u['ranking']))
    logger.info(f"Found {len(top_50)} universities with ranking <= 50.")
    
    # Limit to exactly 50 if there are ties
    top_50 = top_50[:50]
    
    seeded_count = 0
    skipped_count = 0
    
    # 4. Insert/Update Universities
    for i, uni in enumerate(top_50):
        uni_name = uni['name']
        logger.info(f"[{i+1}/50] Processing {uni_name} (Rank: {uni['ranking']})...")
        
        # Check if already exists in DB
        existing = db.query(University).filter(University.name == uni_name).first()
        if existing:
            logger.info(f"University '{uni_name}' already exists in database. Skipping.")
            skipped_count += 1
            continue
            
        # Map country
        country_name = uni.get('country_name') or uni.get('country')
        if not country_name:
            country_name = "United States" # Fallback default
            
        c_obj = country_map.get(country_name.lower().strip())
        if not c_obj:
            # Fallback map to United States or first country
            c_obj = db.query(Country).filter(Country.name == 'United States').first()
            if not c_obj:
                c_obj = db.query(Country).first()
                
        country_id = c_obj.id if c_obj else None
        
        # Generate clearbit logo URL
        domain = extract_domain(uni.get('website'))
        logo_url = f"https://logo.clearbit.com/{domain}" if domain else "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=120"
        
        # Enrich fields using LLM
        enriched = enrich_university_details(uni_name, uni.get('website'), uni.get('description', ''))
        
        # Create record
        new_uni = University(
            name=uni_name,
            country_id=country_id,
            logo_url=logo_url,
            ranking=int(uni['ranking']),
            tuition_fee_min=float(uni.get('tuition_fee_min') or 0.0),
            tuition_fee_max=float(uni.get('tuition_fee_max') or 0.0),
            acceptance_rate=float(uni.get('acceptance_rate') or 10.0),
            description=uni.get('description', f"Top world class research university: {uni_name}."),
            website=uni.get('website', ''),
            application_procedure=enriched.get('application_procedure', ''),
            eligibility_requirements=enriched.get('eligibility_requirements', '')
        )
        
        db.add(new_uni)
        db.commit()
        seeded_count += 1
        logger.info(f"Successfully seeded {uni_name}.")
        # Brief pause to respect API rate limits
        time.sleep(1.5)
        
    db.close()
    logger.info(f"Seeding completed! Seeded: {seeded_count}, Skipped: {skipped_count}")

if __name__ == "__main__":
    run_seeding()
