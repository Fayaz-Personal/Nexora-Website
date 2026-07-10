import time
import logging
from scrapers.travel import TravelScraper
from agents.agent_orchestrator import extract_structured_data, process_scraped_data, SessionLocal
from utils.models import AIActivityLog, Country

logger = logging.getLogger("TravelAgent")

def run_travel_agent():
    logger.info("Starting Travel Agent...")
    start_time = time.time()
    records_collected = 0
    records_updated = 0
    success = True
    failure_reason = None
    
    db = SessionLocal()
    
    try:
        germany = db.query(Country).filter(Country.name == 'Germany').first()
        
        # Scrape flight estimates
        travel_url = "https://www.flights-tracker.com/routes/india-germany"
        travel_scraper = TravelScraper()
        travel_scraped = travel_scraper.scrape(travel_url)
        
        if travel_scraped["success"]:
            logger.info("Extracting Flight details...")
            travel_schema = """
            {
              "origin": "India",
              "est_cost": 45000.00,
              "checklist_json": {
                "airline": "Lufthansa",
                "duration": "8h 30m",
                "baggage_allowance": "23kg"
              }
            }
            """
            travel_data = extract_structured_data(
                travel_scraped["text_content"],
                travel_schema,
                "Extract Flight cost details."
            )
            
            if travel_data and "origin" in travel_data:
                travel_data["destination_country_id"] = germany.id if germany else 1
                records_collected += 1
                res = process_scraped_data("flights", "origin", travel_data["origin"], travel_data)
                if res:
                    records_updated += 1

    except Exception as e:
        logger.error(f"Error in TravelAgent: {e}")
        success = False
        failure_reason = str(e)
    finally:
        processing_time = time.time() - start_time
        log_entry = AIActivityLog(
            agent_name='travel',
            website='FlightTracker India-Germany',
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
        logger.info("Travel Agent run finished.")
