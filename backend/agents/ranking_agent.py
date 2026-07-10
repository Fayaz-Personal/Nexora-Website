import os
import csv
import logging
import time
from sqlalchemy import text
from utils.db import engine, SessionLocal, Base
from utils.models import University, RankingHistory, AIActivityLog

logger = logging.getLogger("RankingAgent")

def run_ranking_agent():
    logger.info("Starting Ranking Synchronization Agent...")
    start_time = time.time()
    records_collected = 0
    records_updated = 0
    success = True
    failure_reason = None
    
    # Ensure database tables exist (e.g. ranking_history if not created yet)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    csv_filename = "QS World University Rankings 2025 (Top global universities).csv"
    csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), csv_filename)
    
    if not os.path.exists(csv_path):
        err_msg = f"Kaggle QS Rankings CSV file not found at: {csv_path}"
        logger.error(err_msg)
        db.close()
        return
        
    try:
        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                raw_name = row.get("Institution_Name", "")
                if not raw_name:
                    continue
                    
                # Clean name: remove parenthetical abbreviations e.g. "University of Oxford (Oxford)" -> "University of Oxford"
                clean_name = raw_name.split(' (')[0].strip()
                
                # Fetch matching university in Database
                univ = db.query(University).filter(
                    (University.name.ilike(f"%{clean_name}%")) | 
                    (University.name.ilike(f"%{raw_name.strip()}%"))
                ).first()
                
                if univ:
                    records_collected += 1
                    
                    # Update active rank on university model
                    rank_str = row.get("RANK_2025", "")
                    # Clean rank string if it contains extra chars, e.g. "15=" -> 15
                    rank_clean = "".join(c for c in rank_str if c.isdigit())
                    rank_val = int(rank_clean) if rank_clean else None
                    
                    if rank_val:
                        univ.ranking = rank_val
                        
                    # Handle overall score conversion
                    score_str = row.get("Overall_Score", "")
                    score_val = None
                    try:
                        score_val = float(score_str) if score_str else None
                    except ValueError:
                        pass
                        
                    # Find or update Ranking History entry for Year 2025
                    history = db.query(RankingHistory).filter(
                        RankingHistory.university_id == univ.id,
                        RankingHistory.year_of_ranking == 2025
                    ).first()
                    
                    if history:
                        history.qs_rank = rank_val
                        history.overall_score = score_val
                        history.country = row.get("Location", "")
                        history.region = row.get("Region", "")
                    else:
                        history = RankingHistory(
                            university_id=univ.id,
                            qs_rank=rank_val,
                            overall_score=score_val,
                            country=row.get("Location", ""),
                            region=row.get("Region", ""),
                            year_of_ranking=2025,
                            ranking_source="QS World University Rankings 2025"
                        )
                        db.add(history)
                        
                    records_updated += 1
                    
            db.commit()
            logger.info(f"Mapped and synchronized {records_updated} university ranking records from Kaggle CSV.")

    except Exception as e:
        logger.error(f"Error in RankingAgent: {e}")
        db.rollback()
        success = False
        failure_reason = str(e)
    finally:
        processing_time = time.time() - start_time
        log_entry = AIActivityLog(
            agent_name='ranking',
            website='Kaggle QS World Rankings CSV Dataset',
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
        logger.info("Ranking Agent run finished.")
