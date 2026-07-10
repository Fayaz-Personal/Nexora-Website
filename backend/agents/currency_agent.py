import time
import logging
import urllib.request
import json
from agents.agent_orchestrator import get_api_key, SessionLocal
from utils.models import AIActivityLog, CurrencyRate

logger = logging.getLogger("CurrencyAgent")

def run_currency_agent():
    logger.info("Starting Currency Exchange Sync Agent...")
    start_time = time.time()
    records_collected = 0
    records_updated = 0
    success = True
    failure_reason = None
    
    db = SessionLocal()
    
    api_key = get_api_key('EXCHANGERATE_API_KEY')
    if not api_key:
        # Fallback to key provided by user directly
        api_key = "8ab88002541db14e52df7592"
        
    url = f"https://v6.exchangerate-api.com/v6/{api_key}/latest/USD"
    
    try:
        logger.info("Fetching exchange rates from ExchangeRate-API...")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = response.read().decode('utf-8')
            parsed = json.loads(res_body)
            
            if parsed.get("result") == "success":
                conversion_rates = parsed.get("conversion_rates", {})
                supported_currencies = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'SGD']
                
                for code in supported_currencies:
                    if code in conversion_rates:
                        rate_val = float(conversion_rates[code])
                        records_collected += 1
                        
                        # Cache rate in currency_rates table
                        cur_rate = db.query(CurrencyRate).filter(CurrencyRate.code == code).first()
                        if cur_rate:
                            cur_rate.rate_to_usd = rate_val
                        else:
                            cur_rate = CurrencyRate(code=code, rate_to_usd=rate_val)
                            db.add(cur_rate)
                            
                        records_updated += 1
                db.commit()
                logger.info(f"Successfully synchronized {records_updated} exchange rates to database.")
            else:
                raise Exception(f"API error: {parsed.get('error-type', 'unknown')}")

    except Exception as e:
        logger.error(f"Failed to fetch exchange rates: {e}. Using cached rates.")
        success = False
        failure_reason = str(e)
    finally:
        processing_time = time.time() - start_time
        log_entry = AIActivityLog(
            agent_name='currency',
            website='ExchangeRate-API Endpoint',
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
        logger.info("Currency Agent run finished.")
