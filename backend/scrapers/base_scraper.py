import requests
from bs4 import BeautifulSoup
import time
import logging
from typing import Dict, Any, Optional

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - [%(name)s] %(message)s')

class BaseScraper:
    def __init__(self, name: str, default_headers: Optional[Dict[str, str]] = None):
        self.name = name
        self.logger = logging.getLogger(name)
        self.headers = default_headers or {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        }

    def fetch_page_content(self, url: str, retries: int = 3, delay: int = 2) -> Optional[str]:
        """Fetch raw HTML content from the given URL with a basic retry mechanism."""
        self.logger.info(f"Initiating fetch request for URL: {url}")
        for attempt in range(1, retries + 1):
            try:
                response = requests.get(url, headers=self.headers, timeout=15)
                response.raise_for_status()
                self.logger.info(f"Successful fetch on attempt {attempt}")
                return response.text
            except requests.exceptions.RequestException as e:
                self.logger.warning(f"Attempt {attempt}/{retries} failed for {url}: {e}")
                if attempt < retries:
                    time.sleep(delay * attempt)
                else:
                    self.logger.error(f"All fetch attempts failed for URL: {url}")
                    return None

    def parse_html(self, html_content: str) -> BeautifulSoup:
        """Parse raw HTML content using BeautifulSoup."""
        return BeautifulSoup(html_content, 'html.parser')

    def scrape(self, url: str) -> Dict[str, Any]:
        """Override this method in sub-scrapers to return structured scraped data."""
        raise NotImplementedError("Subclasses must implement the scrape method.")
