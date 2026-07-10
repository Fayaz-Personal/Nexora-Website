import sys
sys.path.append('backend')
from agents.agent_orchestrator import extract_structured_data, call_llm
from scrapers.daad import DAADScraper

daad_scraper = DAADScraper()
daad_scraped = daad_scraper.scrape()
text_content = daad_scraped["text_content"]

daad_schema = """
{
  "name": "Official name of the scholarship (string, e.g. 'DAAD Development-Related Postgraduate Courses (EPOS) Scholarship')",
  "provider": "Provider organization (string, e.g. 'DAAD')",
  "type": "Must be one of 'government', 'university', 'private' (string)",
  "amount": "Funding amount details (string)",
  "eligibility_criteria": "Academic and professional prerequisites (string)",
  "deadline": "Deadline in YYYY-MM-DD format (string)",
  "coverage": "Details of covered expenses like tuition, housing, health insurance (string)"
}
"""

prompt = f"""
You are an expert AI data extraction agent. Analyze the text below and extract relevant fields.
Produce ONLY a valid raw JSON object. Do NOT include markdown tags, code blocks, or explanations.

Instructions: Extract DAAD Scholarship details. Ensure deadline is in format YYYY-MM-DD. Set type to 'government'.
Target JSON Schema Description:
{daad_schema}

Text Content to Extract:
\"\"\"
{text_content}
\"\"\"
"""

print("Prompt:")
print(prompt)
print("\n--- Calling LLM ---")
resp = call_llm(prompt)
print("Raw Response:")
print(repr(resp))
