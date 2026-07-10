import time
import logging
from scrapers.mit import MITScraper
from scrapers.oxford import OxfordScraper
from agents.agent_orchestrator import extract_structured_data, process_scraped_data, SessionLocal
from utils.models import AIActivityLog, Country

logger = logging.getLogger("UniversityAgent")

def run_university_agent():
    logger.info("Starting University Update Agent...")
    start_time = time.time()
    records_collected = 0
    records_updated = 0
    success = True
    failure_reason = None
    
    db = SessionLocal()
    
    try:
        from scrapers.generic import GenericScraper
        generic_scraper = GenericScraper()
        
        # Get all active universities in database
        universities = db.query(University).all()
        logger.info(f"Loaded {len(universities)} universities from database for synchronization.")
        
        for univ in universities:
            logger.info(f"Synchronizing university details: {univ.name}...")
            
            # Match scraper and target URL
            if "massachusetts institute" in univ.name.lower():
                scraper = MITScraper()
                url = "https://www.mit.edu/education/"
            elif "oxford" in univ.name.lower():
                scraper = OxfordScraper()
                url = "https://www.ox.ac.uk/admissions/graduate/courses"
            else:
                scraper = generic_scraper
                url = univ.website if (univ.website and univ.website.startswith("http")) else f"https://www.{univ.name.lower().replace(' ', '')}.edu"
                
            logger.info(f"Scraping {univ.name} at {url}...")
            scraped = scraper.scrape(url)
            
            if scraped["success"] and scraped["text_content"]:
                logger.info(f"Extracting structured details for {univ.name}...")
                schema = """
                {
                  "name": "Full name of the university (string)",
                  "tuition_fee_min": 30000.00,
                  "tuition_fee_max": 50000.00,
                  "ranking": 20,
                  "acceptance_rate": 20.0,
                  "description": "Short summary of the institution (string)",
                  "website": "Official website URL (string)",
                  "application_procedure": "Admissions process instructions (string)",
                  "eligibility_requirements": "Admissions requirements text (string)"
                }
                """
                extracted_data = extract_structured_data(
                    scraped["text_content"],
                    schema,
                    f"Extract university details for {univ.name}. Keep fields like name, website, procedure, and fees."
                )
                
                if extracted_data and "name" in extracted_data:
                    # Enforce correct country mapping and keep custom info safe
                    extracted_data["country_id"] = univ.country_id
                    records_collected += 1
                    res = process_scraped_data("universities", "name", univ.name, extracted_data)
                    if res:
                        records_updated += 1

    except Exception as e:
        logger.error(f"Error in UniversityAgent: {e}")
        success = False
        failure_reason = str(e)
    finally:
        processing_time = time.time() - start_time
        # Log to AIActivityLog
        log_entry = AIActivityLog(
            agent_name='university',
            website='MIT & Oxford Portals',
            records_collected=records_collected,
            records_updated=records_updated,
            success=success,
            failure_reason=failure_reason,
            processing_time=processing_time,
            status='completed'
        )
        db.add(log_entry)
        db.commit()
        db.close()
        logger.info("University Agent run finished.")
