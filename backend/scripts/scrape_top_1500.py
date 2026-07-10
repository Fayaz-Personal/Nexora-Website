import os
import sys
# Resolve and append backend directory to system paths
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import csv
import logging
import time
import json
from typing import Dict, Any
from sqlalchemy import text
from utils.db import engine, SessionLocal, Base
from utils.models import University, Country, AIActivityLog
from scrapers.generic import GenericScraper
from agents.agent_orchestrator import extract_structured_data, process_scraped_data

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - [%(name)s] %(message)s')
logger = logging.getLogger("Scrape1500")

def clean_uni_name(raw_name: str) -> str:
    """Strip parenthetical abbreviations from institution names."""
    return raw_name.split(' (')[0].strip()

def run_mass_synchronization(limit: int = 10):
    """
    Reads the QS rankings CSV, matches/creates universities in the database,
    and runs agentic scraping + LLM data extraction for university profiles, courses, exams, and scholarships.
    Supports a 'limit' parameter to run in safe batches to avoid API rate limits.
    """
    logger.info(f"Initializing mass synchronization pipeline (Batch limit: {limit} universities)...")
    start_time = time.time()
    records_collected = 0
    records_updated = 0
    
    # Ensure database session and model schemas exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    csv_filename = "QS World University Rankings 2025 (Top global universities).csv"
    csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), csv_filename)
    checkpoint_path = os.path.join(os.path.dirname(__file__), "sync_checkpoint.json")
    
    if not os.path.exists(csv_path):
        logger.error(f"QS Rankings CSV dataset not found at: {csv_path}")
        db.close()
        return
        
    # Load or initialize checkpoint to resume tracking
    last_processed_rank = 0
    if os.path.exists(checkpoint_path):
        try:
            with open(checkpoint_path, 'r') as f:
                chk = json.load(f)
                last_processed_rank = chk.get("last_processed_rank", 0)
                logger.info(f"Resuming sync from CSV rank checkpoint: {last_processed_rank}")
        except Exception as e:
            logger.warning(f"Failed to read checkpoint file: {e}")
            
    scraper = GenericScraper()
    processed_count = 0
    
    try:
        # Load all countries into a map for fast lookup
        countries_list = db.query(Country).all()
        country_map = {c.name.lower(): c.id for c in countries_list}
        # Add common aliases
        country_map["uk"] = country_map.get("united kingdom")
        country_map["usa"] = country_map.get("united states")
        
        with open(csv_path, mode='r', encoding='utf-8', errors='replace') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                rank_str = row.get("RANK_2025", "")
                rank_clean = "".join(c for c in rank_str if c.isdigit())
                rank_val = int(rank_clean) if rank_clean else 0
                
                # Skip already processed ranks
                if rank_val <= last_processed_rank:
                    continue
                    
                if processed_count >= limit:
                    logger.info(f"Batch limit of {limit} reached. Stopping batch run.")
                    break
                    
                raw_name = row.get("Institution_Name", "")
                if not raw_name:
                    continue
                    
                clean_name = clean_uni_name(raw_name)
                location = row.get("Location", "").strip()
                region = row.get("Region", "").strip()
                overall_score = row.get("Overall_Score", "")
                
                logger.info(f"Processing Rank #{rank_val}: {clean_name} ({location})...")
                
                # 1. Resolve or map country in DB
                country_id = country_map.get(location.lower())
                if not country_id:
                    # Search using substring
                    matched_country = db.query(Country).filter(Country.name.ilike(f"%{location}%")).first()
                    if matched_country:
                        country_id = matched_country.id
                        country_map[location.lower()] = country_id
                    else:
                        # Skip or map to default USA/UK if not found
                        country_id = country_map.get("united states", 2)
                
                # 2. Check if University exists in DB, otherwise create a base record
                univ = db.query(University).filter(University.name.ilike(f"%{clean_name}%")).first()
                if not univ:
                    logger.info(f"Creating new base university record for: {clean_name}")
                    # Construct default domain website
                    domain_name = clean_name.lower().replace(" ", "").replace("universityof", "").replace("university", "")
                    default_url = f"https://www.{domain_name}.edu"
                    univ = University(
                        name=clean_name,
                        country_id=country_id,
                        ranking=rank_val,
                        website=default_url,
                        description=f"Public institution in {location}, {region}."
                    )
                    db.add(univ)
                    db.commit()
                    db.refresh(univ)
                    
                # 3. Scrape official website dynamically
                target_url = univ.website
                logger.info(f"Scraping website: {target_url} for {univ.name}...")
                scraped = scraper.scrape(target_url)
                
                # Introduce throttling delay to respect robots.txt rate limiting
                time.sleep(1.5)
                
                if scraped["success"] and scraped["text_content"]:
                    # 4. Extract Structured University Details using LLM
                    logger.info("Extracting university profile, courses, and scholarships structured data...")
                    schema = """
                    {
                      "profile": {
                        "logo_url": "Logo URL (string)",
                        "description": "Short overview (string)",
                        "application_procedure": "Apply details (string)",
                        "eligibility_requirements": "Admissions requirements text (string)"
                      },
                      "courses": [
                        {
                          "name": "Course Title (string, e.g. 'Master of Science in Electrical Engineering')",
                          "degree_type": "One of 'MSc', 'MTech', 'MBA', 'MS', 'PhD', 'Professional Certification'",
                          "department": "Department name (string)",
                          "duration": "Duration (string)",
                          "fees": 45000.00,
                          "description": "Curriculum overview (string)"
                        }
                      ],
                      "exams": [
                        {
                          "name": "Exam name (string, e.g. 'IELTS')",
                          "min_score": "Minimum qualifying score (string)"
                        }
                      ],
                      "scholarships": [
                        {
                          "name": "Scholarship name (string)",
                          "provider": "Sponsor provider (string)",
                          "amount": "Value details (string)",
                          "deadline": "YYYY-MM-DD format (string)",
                          "coverage": "Stipend coverage summary (string)"
                        }
                      ]
                    }
                    """
                    
                    extracted_data = extract_structured_data(
                        scraped["text_content"],
                        schema,
                        f"Extract university profiles, courses, admissions test criteria, and scholarships for {univ.name}."
                    )
                    
                    # 5. process profile details
                    profile_info = extracted_data.get("profile", {})
                    if profile_info:
                        profile_payload = {
                            "name": univ.name,
                            "country_id": country_id,
                            "ranking": rank_val,
                            "logo_url": profile_info.get("logo_url") or f"https://logo.clearbit.com/{target_url.replace('https://www.', '').replace('http://www.', '').split('/')[0]}",
                            "website": target_url,
                            "description": profile_info.get("description") or univ.description,
                            "application_procedure": profile_info.get("application_procedure"),
                            "eligibility_requirements": profile_info.get("eligibility_requirements")
                        }
                        records_collected += 1
                        if process_scraped_data("universities", "name", univ.name, profile_payload):
                            records_updated += 1
                            
                    # 6. process courses
                    courses = extracted_data.get("courses", [])
                    for course in courses:
                        course["university_id"] = univ.id
                        records_collected += 1
                        if process_scraped_data("courses", "name", course["name"], course):
                            records_updated += 1
                            
                    # 7. process scholarships
                    scholarships = extracted_data.get("scholarships", [])
                    for scholarship in scholarships:
                        records_collected += 1
                        # Map type to government/university fallback
                        scholarship["type"] = "university"
                        if process_scraped_data("scholarships", "name", scholarship["name"], scholarship):
                            records_updated += 1
                            
                # Update checkpoint rank
                last_processed_rank = rank_val
                processed_count += 1
                
                # Write current checkpoint to file
                with open(checkpoint_path, 'w') as f:
                    json.dump({"last_processed_rank": last_processed_rank}, f)
                    
        db.commit()
        logger.info(f"Synchronization batch completed. Processed {processed_count} universities.")

    except Exception as e:
        logger.error(f"Error during mass synchronization: {e}")
        db.rollback()
    finally:
        processing_time = time.time() - start_time
        log_entry = AIActivityLog(
            agent_name='mass_sync',
            website='Mass QS Rankings Pipeline',
            records_collected=records_collected,
            records_updated=records_updated,
            success=True,
            processing_time=processing_time,
            status='completed'
        )
        db.add(log_entry)
        db.commit()
        db.close()
        logger.info("Mass Sync run finished.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Mass University Sync Pipeline")
    parser.add_argument('--limit', type=int, default=10, help="Number of universities to process in this run batch")
    args = parser.parse_args()
    
    run_mass_synchronization(limit=args.limit)
