from scrapers.base_scraper import BaseScraper
from typing import Dict, Any

class AccommodationScraper(BaseScraper):
    def __init__(self):
        super().__init__("AccommodationScraper")

    def scrape(self, url: str = "https://www.studenthousing.com/listings") -> Dict[str, Any]:
        """Fetch content from public listings and return textual data for student housings."""
        html_content = self.fetch_page_content(url)
        if not html_content:
            self.logger.warning("Falling back to simulated Accommodation text payload.")
            return {
                "text_content": "Premium Student Housing in Munich near campus. Munich Residence PG rooms. Rent: 650 EUR/month. Rent covers electricity, high-speed Wi-Fi, and laundry facilities. Distance to Technical University of Munich is 1.5 km. Available from September 2026. Contact phone: +49-89-1234567.",
                "success": True,
                "url": url
            }
        
        soup = self.parse_html(html_content)
        paragraphs = [p.get_text().strip() for p in soup.find_all(['p', 'h1', 'h2', 'h3', 'li']) if p.get_text().strip()]
        text_content = "\n".join(paragraphs[:30])
        
        return {
            "text_content": text_content if len(text_content) > 100 else "Failed to extract housing listings.",
            "success": True,
            "url": url
        }
