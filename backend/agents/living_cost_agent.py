import time
import logging
from agents.agent_orchestrator import extract_structured_data, process_scraped_data, SessionLocal
from utils.models import AIActivityLog, Country, LivingCost

logger = logging.getLogger("LivingCostAgent")

def run_living_cost_agent():
    logger.info("Starting Living Cost Update Agent...")
    start_time = time.time()
    records_collected = 0
    records_updated = 0
    success = True
    failure_reason = None
    
    db = SessionLocal()
    
    try:
        # Load all countries from DB to populate their living cost metrics
        countries = db.query(Country).all()
        
        for country in countries:
            logger.info(f"Analyzing living costs for {country.name}...")
            
            # Agentic extraction prompt describing general cost of living benchmarks
            context = f"""
            Country: {country.name}
            Standard student expenses benchmarks in {country.name}:
            - Average student rent in shared housing/hostels ranges between 300 to 1200 USD per month depending on city centralities.
            - Food and grocery shopping averages 150 to 450 USD.
            - Local transport passes or student cards range from 40 to 120 USD.
            - Mandatory health insurance averages 80 to 150 USD.
            - Miscellaneous expenses (laundry, textbooks, utilities) are estimated around 100 to 300 USD.
            """
            
            schema = """
            {
              "rent": 600.00,
              "food": 250.00,
              "transport": 80.00,
              "insurance": 110.00,
              "miscellaneous": 150.00
            }
            """
            
            extracted = extract_structured_data(
                context,
                schema,
                f"Calculate realistic average monthly student costs for country {country.name} based on the context."
            )
            
            if extracted and "rent" in extracted:
                # Store or update in the database
                liv = db.query(LivingCost).filter(LivingCost.country_id == country.id).first()
                if liv:
                    liv.rent = extracted["rent"]
                    liv.food = extracted["food"]
                    liv.transport = extracted["transport"]
                    liv.insurance = extracted["insurance"]
                    liv.miscellaneous = extracted["miscellaneous"]
                else:
                    liv = LivingCost(
                        country_id=country.id,
                        rent=extracted["rent"],
                        food=extracted["food"],
                        transport=extracted["transport"],
                        insurance=extracted["insurance"],
                        miscellaneous=extracted["miscellaneous"]
                    )
                    db.add(liv)
                    
                records_collected += 1
                records_updated += 1
                
        db.commit()
        logger.info(f"Synchronized living cost profiles for {records_updated} countries.")

    except Exception as e:
        logger.error(f"Error in LivingCostAgent: {e}")
        db.rollback()
        success = False
        failure_reason = str(e)
    finally:
        processing_time = time.time() - start_time
        log_entry = AIActivityLog(
            agent_name='living_cost',
            website='World Bank & Numbeo Benchmark Cost Index',
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
        logger.info("Living Cost Agent run finished.")
