import time
import logging
from scrapers.accommodation import AccommodationScraper
from agents.agent_orchestrator import extract_structured_data, process_scraped_data, SessionLocal
from utils.models import AIActivityLog, Country

logger = logging.getLogger("AccommodationAgent")

def run_accommodation_agent():
    logger.info("Starting Accommodation Agent...")
    start_time = time.time()
    records_collected = 0
    records_updated = 0
    success = True
    failure_reason = None
    
    db = SessionLocal()
    
    try:
        germany = db.query(Country).filter(Country.name == 'Germany').first()
        
        # Scrape accommodations
        acc_url = "https://www.studenthousing.com/listings"
        acc_scraper = AccommodationScraper()
        acc_scraped = acc_scraper.scrape(acc_url)
        
        if acc_scraped["success"]:
            logger.info("Extracting Accommodation details...")
            acc_schema = """
            {
              "title": "Munich Premium Student Residence",
              "city_name": "Munich",
              "type": "student housing",
              "rent": 650.00,
              "distance_to_univ": "1.5 km to TU Munich",
              "availability": true,
              "facilities": ["Wi-Fi", "Laundry", "Electricity"],
              "description": "Premium PG rooms with shared kitchen."
            }
            """
            acc_data = extract_structured_data(
                acc_scraped["text_content"],
                acc_schema,
                "Extract Accommodation details. Ensure facilities is a list of strings."
            )
            
            if acc_data and "title" in acc_data:
                acc_data["country_id"] = germany.id if germany else 1
                records_collected += 1
                res = process_scraped_data("accommodations", "title", acc_data["title"], acc_data)
                if res:
                    records_updated += 1

    except Exception as e:
        logger.error(f"Error in AccommodationAgent: {e}")
        success = False
        failure_reason = str(e)
    finally:
        processing_time = time.time() - start_time
        log_entry = AIActivityLog(
            agent_name='accommodation',
            website='StudentHousing Munich Listings',
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
        logger.info("Accommodation Agent run finished.")
