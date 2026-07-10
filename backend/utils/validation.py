import re
from typing import Dict, Any, Tuple, Optional

def clean_url(url: str) -> str:
    """Clean and validate URL format."""
    if not url:
        return ""
    url = url.strip()
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    return url

def validate_update(table_name: str, new_data: Dict[str, Any], old_data: Optional[Dict[str, Any]] = None) -> Tuple[bool, float, bool, list, Dict[str, Any]]:
    """
    Validate the proposed updates from scrapers.
    Returns (is_valid, confidence_score, flagged_suspicious, issues, sanitized_data)
    """
    issues = []
    flagged_suspicious = False
    confidence_score = 100.0
    sanitized_data = new_data.copy()

    # General Deduplication and cleanup
    for key, val in list(sanitized_data.items()):
        if isinstance(val, str):
            val_clean = val.strip()
            if val_clean == "":
                sanitized_data[key] = None
            else:
                sanitized_data[key] = val_clean

    # Table specific validations
    if table_name == 'universities':
        # Required fields check
        required = ['name', 'country_id']
        for field in required:
            if not sanitized_data.get(field):
                issues.append(f"Missing required field: {field}")
                confidence_score -= 20.0

        # Validate tuition fees
        min_fee = float(sanitized_data.get('tuition_fee_min') or 0)
        max_fee = float(sanitized_data.get('tuition_fee_max') or 0)
        if min_fee < 0 or max_fee < 0:
            issues.append("Tuition fees cannot be negative.")
            flagged_suspicious = True
            confidence_score -= 30.0
        if min_fee > max_fee:
            # swap if min is greater than max
            sanitized_data['tuition_fee_min'] = max_fee
            sanitized_data['tuition_fee_max'] = min_fee
            issues.append("Swapped tuition_fee_min and tuition_fee_max values.")

        # Validate URL
        if sanitized_data.get('website'):
            sanitized_data['website'] = clean_url(sanitized_data['website'])

        # Compare against old data for abnormal changes
        if old_data:
            old_min_fee = float(old_data.get('tuition_fee_min') or 0)
            if old_min_fee > 0 and min_fee > 0:
                fee_change_ratio = (min_fee - old_min_fee) / old_min_fee
                if abs(fee_change_ratio) > 1.0: # More than 100% change is abnormal
                    issues.append(f"Abnormal tuition fee change detected: {fee_change_ratio*100:.1f}%")
                    flagged_suspicious = True
                    confidence_score -= 25.0

    elif table_name == 'courses':
        required = ['name', 'university_id', 'degree_type', 'department']
        for field in required:
            if not sanitized_data.get(field):
                issues.append(f"Missing required field: {field}")
                confidence_score -= 20.0
        
        fees = float(sanitized_data.get('fees') or 0)
        if fees < 0:
            issues.append("Course fees cannot be negative.")
            flagged_suspicious = True
            confidence_score -= 30.0
            
        if old_data:
            old_fees = float(old_data.get('fees') or 0)
            if old_fees > 0 and fees > 0:
                fee_change_ratio = (fees - old_fees) / old_fees
                if abs(fee_change_ratio) > 1.0:
                    issues.append(f"Abnormal course fee change: {fee_change_ratio*100:.1f}%")
                    flagged_suspicious = True
                    confidence_score -= 20.0

    elif table_name == 'scholarships':
        required = ['name', 'type']
        for field in required:
            if not sanitized_data.get(field):
                issues.append(f"Missing required field: {field}")
                confidence_score -= 25.0

    elif table_name == 'accommodations':
        required = ['title', 'rent', 'country_id', 'city_name', 'type']
        for field in required:
            if not sanitized_data.get(field):
                issues.append(f"Missing required field: {field}")
                confidence_score -= 20.0
                
        rent = float(sanitized_data.get('rent') or 0)
        if rent <= 0:
            issues.append("Rent must be positive.")
            confidence_score -= 30.0
            
        if old_data:
            old_rent = float(old_data.get('rent') or 0)
            if old_rent > 0 and rent > 0:
                rent_change = (rent - old_rent) / old_rent
                if abs(rent_change) > 1.0:
                    issues.append(f"Abnormal rent change: {rent_change*100:.1f}%")
                    flagged_suspicious = True
                    confidence_score -= 20.0

    elif table_name == 'visas':
        required = ['country_id']
        if not sanitized_data.get('country_id'):
            issues.append("Visa updates must reference a country_id.")
            confidence_score -= 40.0
            
        fee = float(sanitized_data.get('fee') or 0)
        if fee < 0:
            issues.append("Visa fee cannot be negative.")
            confidence_score -= 20.0

    elif table_name == 'flights':
        required = ['origin', 'destination_country_id', 'est_cost']
        for field in required:
            if not sanitized_data.get(field):
                issues.append(f"Missing required field: {field}")
                confidence_score -= 20.0
                
        cost = float(sanitized_data.get('est_cost') or 0)
        if cost <= 0:
            issues.append("Flight cost estimate must be positive.")
            confidence_score -= 30.0

    # Guarantee final confidence bounds
    confidence_score = max(0.0, min(100.0, confidence_score))
    
    # If there are critical missing requirements, mark as invalid
    is_valid = len([i for i in issues if "Missing required" in i]) == 0
    if confidence_score < 40.0:
        is_valid = False

    return is_valid, confidence_score, flagged_suspicious, issues, sanitized_data
