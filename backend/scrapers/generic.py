from scrapers.base_scraper import BaseScraper
from typing import Dict, Any

class GenericScraper(BaseScraper):
    def __init__(self):
        super().__init__("GenericScraper")

    def scrape(self, url: str) -> Dict[str, Any]:
        """Fetch content from any URL and extract clean text content for LLM ingestion."""
        html_content = self.fetch_page_content(url)
        if not html_content:
            # Return basic metadata if request fails completely
            return {
                "text_content": "",
                "success": False,
                "url": url,
                "error": "Failed to retrieve page content."
            }
        
        soup = self.parse_html(html_content)
        # Extract readable content tags, filtering out scripts/styles/navigation
        for element in soup(["script", "style", "nav", "footer", "header"]):
            element.decompose()
            
        paragraphs = [p.get_text().strip() for p in soup.find_all(['p', 'h1', 'h2', 'h3', 'li']) if p.get_text().strip()]
        # Join lines and truncate to fit LLM input token budgets comfortably
        text_content = "\n".join(paragraphs[:50])
        
        return {
            "text_content": text_content if len(text_content) > 50 else "Insufficient text content found.",
            "success": True,
            "url": url
        }
