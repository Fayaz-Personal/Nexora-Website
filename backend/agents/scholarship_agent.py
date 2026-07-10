import time
import logging
from scrapers.daad import DAADScraper
from agents.agent_orchestrator import extract_structured_data, process_scraped_data, SessionLocal
from utils.models import AIActivityLog

logger = logging.getLogger("ScholarshipAgent")

def run_scholarship_agent():
    logger.info("Starting Scholarship Agent...")
    start_time = time.time()
    records_collected = 0
    records_updated = 0
    success = True
    failure_reason = None
    
    db = SessionLocal()
    
    try:
        # Scrape DAAD scholarships
        daad_url = "https://www.daad.de/en/study-and-research-in-germany/scholarships/"
        daad_scraper = DAADScraper()
        daad_scraped = daad_scraper.scrape(daad_url)
        
        if daad_scraped["success"]:
            logger.info("Extracting DAAD Scholarship details...")
            daad_schema = """
            {
              "name": "Official name of the scholarship (string, e.g. 'DAAD Development-Related Postgraduate Courses (EPOS) Scholarship')",
              "provider": "Provider organization (string, e.g. 'DAAD')",
              "type": "Must be one of 'government', 'university', 'private' (string)",
              "amount": "Funding amount details (string)",
              "eligibility_criteria": "Academic and professional prerequisites (string)",
              "deadline": "Deadline in YYYY-MM-DD format (string)",
              "coverage": "Details of covered expenses like tuition, housing, health insurance (string)"
            }
            """
            daad_data = extract_structured_data(
                daad_scraped["text_content"],
                daad_schema,
                "Extract DAAD Scholarship details. Ensure deadline is in format YYYY-MM-DD. Set type to 'government'."
            )
            
            if daad_data and "name" in daad_data:
                records_collected += 1
                res = process_scraped_data("scholarships", "name", daad_data["name"], daad_data)
                if res:
                    records_updated += 1

    except Exception as e:
        logger.error(f"Error in ScholarshipAgent: {e}")
        success = False
        failure_reason = str(e)
    finally:
        processing_time = time.time() - start_time
        log_entry = AIActivityLog(
            agent_name='scholarship',
            website='DAAD Scholarship Portal',
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
        logger.info("Scholarship Agent run finished.")
