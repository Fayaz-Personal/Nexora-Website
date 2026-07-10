import argparse
import sys
import logging
from apscheduler.schedulers.blocking import BlockingScheduler
from agents.university_agent import run_university_agent
from agents.scholarship_agent import run_scholarship_agent
from agents.accommodation_agent import run_accommodation_agent
from agents.travel_agent import run_travel_agent
from agents.visa_agent import run_visa_agent
from agents.course_agent import run_course_agent
from agents.exam_requirement_agent import run_exam_requirement_agent
from agents.ranking_agent import run_ranking_agent
from agents.living_cost_agent import run_living_cost_agent
from agents.currency_agent import run_currency_agent

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("SchedulerMain")

def run_all_agents():
    logger.info("Executing all AI agents sequentially...")
    run_currency_agent()
    run_university_agent()
    run_course_agent()
    run_exam_requirement_agent()
    run_ranking_agent()
    run_scholarship_agent()
    run_living_cost_agent()
    run_accommodation_agent()
    run_travel_agent()
    run_visa_agent()
    logger.info("All AI agents execution completed!")

def start_scheduler():
    scheduler = BlockingScheduler()
    
    # 0. Currency Agent (Daily - Base cache)
    scheduler.add_job(run_currency_agent, 'interval', days=1, name='currency_agent')
    # 1. University Agent (Weekly)
    scheduler.add_job(run_university_agent, 'interval', weeks=1, name='university_agent')
    # 2. Course Agent (Weekly)
    scheduler.add_job(run_course_agent, 'interval', weeks=1, name='course_agent')
    # 3. Exam Requirement Agent (Weekly)
    scheduler.add_job(run_exam_requirement_agent, 'interval', weeks=1, name='exam_requirement_agent')
    # 4. Ranking Agent (Weekly)
    scheduler.add_job(run_ranking_agent, 'interval', weeks=1, name='ranking_agent')
    # 5. Scholarship Agent (Daily)
    scheduler.add_job(run_scholarship_agent, 'interval', days=1, name='scholarship_agent')
    # 6. Living Cost Agent (Weekly)
    scheduler.add_job(run_living_cost_agent, 'interval', weeks=1, name='living_cost_agent')
    # 7. Accommodation Agent (Daily)
    scheduler.add_job(run_accommodation_agent, 'interval', days=1, name='accommodation_agent')
    # 8. Travel Agent (Daily)
    scheduler.add_job(run_travel_agent, 'interval', days=1, name='travel_agent')
    # 9. Visa Agent (Weekly)
    scheduler.add_job(run_visa_agent, 'interval', weeks=1, name='visa_agent')
    
    logger.info("APScheduler initialized and running...")
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler shutting down...")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Nexora AI Agents Automation Service")
    parser.add_argument('--run-once', action='store_true', help="Run all AI agents once immediately and exit")
    args = parser.parse_args()

    if args.run_once:
        run_all_agents()
        sys.exit(0)
    else:
        start_scheduler()
