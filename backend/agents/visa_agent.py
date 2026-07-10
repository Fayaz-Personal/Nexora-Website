import time
import logging
from scrapers.visa import VisaScraper
from agents.agent_orchestrator import extract_structured_data, process_scraped_data, SessionLocal
from utils.models import AIActivityLog, Country

logger = logging.getLogger("VisaAgent")

def run_visa_agent():
    logger.info("Starting Visa Agent...")
    start_time = time.time()
    records_collected = 0
    records_updated = 0
    success = True
    failure_reason = None
    
    db = SessionLocal()
    
    try:
        germany = db.query(Country).filter(Country.name == 'Germany').first()
        
        # Scrape visa requirements
        visa_url = "https://www.germany.info/visa/student"
        visa_scraper = VisaScraper()
        visa_scraped = visa_scraper.scrape(visa_url)
        
        if visa_scraped["success"]:
            logger.info("Extracting Visa details...")
            visa_schema = """
            {
              "requirements": "Blocked account funds of €11,908 per year are required.",
              "documents_required": ["Passport", "Letter of Admission", "Health Insurance"],
              "timeline": "4-8 weeks",
              "fee": 75.00,
              "checklist_json": {
                "blocked_account_amount_eur": 11908,
                "visa_type": "National Visa (Subclass D)"
              }
            }
            """
            visa_data = extract_structured_data(
                visa_scraped["text_content"],
                visa_schema,
                "Extract German student visa requirements."
            )
            
            if visa_data:
                # Visas table uses country_id as unique identifier
                visa_data["country_id"] = germany.id if germany else 1
                records_collected += 1
                res = process_scraped_data("visas", "country_id", str(visa_data["country_id"]), visa_data)
                if res:
                    records_updated += 1

    except Exception as e:
        logger.error(f"Error in VisaAgent: {e}")
        success = False
        failure_reason = str(e)
    finally:
        processing_time = time.time() - start_time
        log_entry = AIActivityLog(
            agent_name='visa',
            website='German Immigration Portal',
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
        logger.info("Visa Agent run finished.")
