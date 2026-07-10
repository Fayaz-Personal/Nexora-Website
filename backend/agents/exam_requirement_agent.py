import time
import logging
from scrapers.mit import MITScraper
from scrapers.oxford import OxfordScraper
from agents.agent_orchestrator import extract_structured_data, process_scraped_data, SessionLocal
from utils.models import AIActivityLog, Course, EntranceExam

logger = logging.getLogger("ExamRequirementAgent")

def run_exam_requirement_agent():
    logger.info("Starting Exam Requirement Update Agent...")
    start_time = time.time()
    records_collected = 0
    records_updated = 0
    success = True
    failure_reason = None
    
    db = SessionLocal()
    
    try:
        # Scrape Oxford/MIT requirements pages
        logger.info("Scraping admissions exam info...")
        ox_url = "https://www.ox.ac.uk/admissions/graduate/courses"
        ox_scraper = OxfordScraper()
        ox_scraped = ox_scraper.scrape(ox_url)
        
        if ox_scraped["success"]:
            ox_schema = """
            {
              "exams": [
                {
                  "name": "IELTS",
                  "full_name": "International English Language Testing System",
                  "syllabus": "Listening, Reading, Writing, Speaking",
                  "registration_link": "https://www.ielts.org",
                  "test_dates": {},
                  "resources_json": {}
                }
              ],
              "requirements": [
                {
                  "course_name": "MSc in Advanced Computer Science",
                  "exam_name": "IELTS",
                  "min_score": "7.5"
                }
              ]
            }
            """
            extracted = extract_structured_data(
                ox_scraped["text_content"],
                ox_schema,
                "Extract required admission examinations and their minimum qualifying scores."
            )
            
            # 1. Process Exams
            exams = extracted.get("exams", [])
            for exam in exams:
                records_collected += 1
                res = process_scraped_data("entrance_exams", "name", exam["name"], exam)
                if res:
                    records_updated += 1
                    
            # 2. Process Requirements
            requirements = extracted.get("requirements", [])
            for req in requirements:
                # Map course_name to course_id
                course_record = db.query(Course).filter(Course.name.like(f"%{req['course_name']}%")).first()
                exam_record = db.query(EntranceExam).filter(EntranceExam.name == req['exam_name']).first()
                
                if course_record and exam_record:
                    req_data = {
                        "course_id": course_record.id,
                        "exam_id": exam_record.id,
                        "min_score": req["min_score"]
                    }
                    records_collected += 1
                    # Since course_exam_requirements table uses composite keys, we can match on both identifiers
                    # For process_scraped_data, we can check by mapping using min_score as value identifier
                    res = process_scraped_data("course_exam_requirements", "min_score", req["min_score"], req_data)
                    if res:
                        records_updated += 1

    except Exception as e:
        logger.error(f"Error in ExamRequirementAgent: {e}")
        success = False
        failure_reason = str(e)
    finally:
        processing_time = time.time() - start_time
        log_entry = AIActivityLog(
            agent_name='exam_requirement',
            website='Oxford & MIT Admissions Portals',
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
        logger.info("Exam Requirement Agent run finished.")
