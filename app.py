import os
import time
import hashlib
import re
import requests
from flask import Flask, jsonify, render_template, request
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET

app = Flask(__name__)

# Cache configuration
CACHE = {
    'data': None,
    'last_updated': 0
}
CACHE_DURATION = 300  # 5 minutes in seconds

def generate_id(date_str, type_str, text_content):
    unique_str = f"{date_str}-{type_str}-{text_content[:100]}"
    return hashlib.md5(unique_str.encode('utf-8')).hexdigest()

def parse_entry_content(date_str, updated_str, entry_url, content_html):
    if not content_html:
        return []
        
    soup = BeautifulSoup(content_html, 'html.parser')
    h3_tags = soup.find_all('h3')
    
    updates = []
    
    if not h3_tags:
        # If there are no h3 tags, treat the whole content as one update
        text_content = soup.get_text().strip()
        u_id = generate_id(date_str, 'General', text_content)
        updates.append({
            'id': u_id,
            'date': date_str,
            'updated': updated_str,
            'url': entry_url,
            'type': 'General',
            'content': str(soup),
            'text_content': text_content
        })
        return updates
        
    for h3 in h3_tags:
        update_type = h3.get_text().strip()
        # Collect all siblings until the next h3
        sibling_content = []
        sibling = h3.next_sibling
        while sibling and sibling.name != 'h3':
            sibling_content.append(str(sibling))
            sibling = sibling.next_sibling
            
        html_str = "".join(sibling_content).strip()
        sub_soup = BeautifulSoup(html_str, 'html.parser')
        text_content = sub_soup.get_text().strip()
        
        # Clean text_content to remove double spaces, weird returns
        text_content = re.sub(r'\s+', ' ', text_content).strip()
        
        u_id = generate_id(date_str, update_type, text_content)
        
        updates.append({
            'id': u_id,
            'date': date_str,
            'updated': updated_str,
            'url': entry_url,
            'type': update_type,
            'content': html_str,
            'text_content': text_content
        })
        
    return updates

def fetch_and_parse_notes(force_refresh=False):
    now = time.time()
    if not force_refresh and CACHE['data'] and (now - CACHE['last_updated'] < CACHE_DURATION):
        return CACHE['data'], 'cache'
        
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Parse XML
        root = ET.fromstring(response.content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        entries = root.findall('atom:entry', ns)
        
        all_updates = []
        for entry in entries:
            title_elem = entry.find('atom:title', ns)
            date_str = title_elem.text if title_elem is not None else "Unknown Date"
            
            link_elem = entry.find('atom:link[@rel="alternate"]', ns)
            if link_elem is None:
                link_elem = entry.find('atom:link', ns)
            entry_url = link_elem.get('href') if link_elem is not None else ""
            
            updated_elem = entry.find('atom:updated', ns)
            updated_str = updated_elem.text if updated_elem is not None else ""
            
            content_elem = entry.find('atom:content', ns)
            content_html = content_elem.text if content_elem is not None else ""
            
            updates = parse_entry_content(date_str, updated_str, entry_url, content_html)
            all_updates.extend(updates)
            
        CACHE['data'] = all_updates
        CACHE['last_updated'] = now
        return all_updates, 'live'
        
    except Exception as e:
        print(f"Error fetching release notes: {e}")
        if CACHE['data']:
            return CACHE['data'], 'cache_fallback'
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        notes, source = fetch_and_parse_notes(force_refresh=force_refresh)
        return jsonify({
            'success': True,
            'source': source,
            'last_updated': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(CACHE['last_updated'])),
            'data': notes
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
