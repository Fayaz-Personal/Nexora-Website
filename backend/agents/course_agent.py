import time
import logging
from scrapers.mit import MITScraper
from scrapers.oxford import OxfordScraper
from agents.agent_orchestrator import extract_structured_data, process_scraped_data, SessionLocal
from utils.models import AIActivityLog, University

logger = logging.getLogger("CourseAgent")

def run_course_agent():
    logger.info("Starting Course Update Agent...")
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
        logger.info(f"Loaded {len(universities)} universities from database for course synchronization.")
        
        for univ in universities:
            logger.info(f"Scraping courses for university: {univ.name}...")
            
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
                
            logger.info(f"Scraping courses at {url}...")
            scraped = scraper.scrape(url)
            
            if scraped["success"] and scraped["text_content"]:
                schema = """
                {
                  "courses": [
                    {
                      "name": "Course Title (string, e.g. 'Master of Science in Electrical Engineering')",
                      "degree_type": "One of 'MSc', 'MTech', 'MBA', 'MS', 'PhD', 'Professional Certification'",
                      "department": "Department name (string)",
                      "duration": "Duration description (string, e.g. '2 Years')",
                      "fees": 45000.00,
                      "description": "Short curriculum overview (string)"
                    }
                  ]
                }
                """
                extracted = extract_structured_data(
                    scraped["text_content"],
                    schema,
                    f"Extract academic courses for {univ.name}."
                )
                
                courses = extracted.get("courses", [])
                for course in courses:
                    course["university_id"] = univ.id
                    records_collected += 1
                    res = process_scraped_data("courses", "name", course["name"], course)
                    if res:
                        records_updated += 1

    except Exception as e:
        logger.error(f"Error in CourseAgent: {e}")
        success = False
        failure_reason = str(e)
    finally:
        processing_time = time.time() - start_time
        log_entry = AIActivityLog(
            agent_name='course',
            website='MIT & Oxford Education Portals',
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
        logger.info("Course Agent run finished.")
