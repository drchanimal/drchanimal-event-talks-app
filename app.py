import re
import time
import hashlib
import logging
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Cache configuration
CACHE_EXPIRY_SECONDS = 300  # 5 minutes
cache_data = None
cache_timestamp = 0

def clean_html_to_text(html_content):
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', html_content)
    # Replace multiple whitespaces/newlines with a single space
    text = re.sub(r'\s+', ' ', text)
    # Resolve common HTML entities
    text = text.replace('&nbsp;', ' ').replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&').replace('&quot;', '"')
    return text.strip()

def fetch_and_parse_feed():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'BigQueryReleaseNotesReader/1.0'}
    )
    
    with urllib.request.urlopen(req, timeout=10) as response:
        xml_data = response.read()
    
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    parsed_items = []
    
    for entry in root.findall('atom:entry', ns):
        date_str = entry.find('atom:title', ns)
        date_str = date_str.text.strip() if date_str is not None else "Unknown Date"
        
        updated_str = entry.find('atom:updated', ns)
        updated_str = updated_str.text.strip() if updated_str is not None else ""
        
        link_elem = entry.find('atom:link', ns)
        link_url = link_elem.attrib.get('href') if link_elem is not None else ''
        
        content_elem = entry.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ''
        
        # Split by h3 tags to isolate individual items
        parts = re.split(r'<h3[^>]*>(.*?)</h3>', content_html, flags=re.IGNORECASE)
        
        if len(parts) > 1:
            # Index 0 is text before first <h3> (usually empty or layout space)
            # Odd indices are header contents, even indices are descriptions
            for idx in range(1, len(parts), 2):
                update_type = parts[idx].strip()
                desc_html = parts[idx+1].strip() if idx+1 < len(parts) else ""
                
                # Clean description text for Twitter drafting
                plain_desc = clean_html_to_text(desc_html)
                
                # Create a unique ID
                raw_id = f"{date_str}-{update_type}-{idx}"
                item_id = hashlib.md5(raw_id.encode('utf-8')).hexdigest()
                
                parsed_items.append({
                    "id": item_id,
                    "date": date_str,
                    "updated": updated_str,
                    "link": link_url,
                    "type": update_type,
                    "description": desc_html,
                    "plain_text": plain_desc
                })
        else:
            # Fallback if there are no <h3> tags in the entry content
            plain_desc = clean_html_to_text(content_html)
            raw_id = f"{date_str}-Update-0"
            item_id = hashlib.md5(raw_id.encode('utf-8')).hexdigest()
            
            parsed_items.append({
                "id": item_id,
                "date": date_str,
                "updated": updated_str,
                "link": link_url,
                "type": "Update",
                "description": content_html,
                "plain_text": plain_desc
            })
            
    return parsed_items

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    global cache_data, cache_timestamp
    
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    if force_refresh or not cache_data or (current_time - cache_timestamp > CACHE_EXPIRY_SECONDS):
        try:
            logger.info("Fetching fresh release notes feed from source...")
            cache_data = fetch_and_parse_feed()
            cache_timestamp = current_time
        except Exception as e:
            logger.error(f"Error fetching feed: {e}")
            if cache_data:
                # Fallback to expired cache instead of failing if we have it
                logger.warning("Failed to fetch fresh feed, returning stale cached data.")
                return jsonify({
                    "status": "warning",
                    "message": f"Failed to refresh. Using cached data from {time.ctime(cache_timestamp)}.",
                    "data": cache_data
                })
            else:
                return jsonify({
                    "status": "error",
                    "message": f"Failed to fetch release notes: {str(e)}"
                }), 500
                
    return jsonify({
        "status": "success",
        "data": cache_data,
        "cached_at": time.ctime(cache_timestamp)
    })

if __name__ == '__main__':
    # Run locally on port 5001 to avoid common permission or port conflicts
    app.run(debug=True, host='127.0.0.1', port=5001)
