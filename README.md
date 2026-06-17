# BigQuery Release Pulse

A premium, high-fidelity web application built with **Python Flask** and vanilla **HTML5, CSS3, and JavaScript**. It tracks Google Cloud BigQuery release notes in real-time, splits daily entries into individual, granular updates, and includes a smart social composer for drafting and posting updates directly to X (Twitter).

---

## 🌟 Key Features

*   **Granular XML Parsing**: Uses `BeautifulSoup` on the backend to parse the Atom feed's raw HTML, splitting combined daily release entries into discrete updates (by `Feature`, `Issue`, `Announcement`, `Change`, `Deprecation`, and `General` tags) for selective reading and sharing.
*   **Aesthetic Dark-Mode Dashboard**: Features glassmorphic panels, glowing radial backdrop animation elements, clean modern typography (`Outfit` and `Inter`), responsive layouts, and transitions.
*   **Advanced Client-Side Filtering**:
    *   **Live Text Search**: Instantly parses card dates, types, and content text.
    *   **Category Tabs**: Shows badge counters representing the tally of updates under each tag.
    *   **Sorting**: Easily toggles feed order between newest and oldest first.
*   **Smart X (Twitter) Share Composer**:
    *   Pre-compiles post text containing dates, types, description snippets, and documentation links.
    *   Calculates exact character constraints (simulating X's t.co wrapping policy by treating all URLs as exactly 23 characters).
    *   Displays an interactive circular SVG progress ring (Blue for standard, Orange for warning, Red for overflow).
    *   Supports one-click **Copy Text** and **Post to X** shortcuts.
*   **In-Memory Server Caching**: Caches feed data for 5 minutes (`300` seconds) to maximize performance and avoid Google feed server rate limits, while supporting manual force-refreshes.

---

## 📁 Project Structure

```text
bq-releases-notes/
├── app.py                  # Flask backend & XML parser
├── templates/
│   └── index.html          # Semantic HTML dashboard template
├── static/
│   ├── css/
│   │   └── style.css       # Custom styles & glassmorphic system
│   └── js/
│   │   └── app.js          # Client-side state & tweet composer logic
├── .gitignore              # Ignores python environment, caches, & IDE files
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
*   Python 3.8 or higher
*   Git

### Installation Steps

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Radax023/my-event-talks-app.git
    cd my-event-talks-app
    ```

2.  **Set Up Virtual Environment**:
    ```bash
    # Create the virtual environment
    python -m venv .venv

    # Activate the virtual environment
    # On Windows:
    .venv\Scripts\activate
    # On macOS/Linux:
    source .venv/bin/activate
    ```

3.  **Install Dependencies**:
    ```bash
    pip install Flask requests beautifulsoup4
    ```

4.  **Run the Server**:
    ```bash
    python app.py
    ```

5.  **Access the Dashboard**:
    Open your browser and navigate to `http://127.0.0.1:5000/`.

---

## 🛠️ Tech Stack

*   **Backend**: Python, Flask, requests, BeautifulSoup4, xml.etree.ElementTree
*   **Frontend**: Vanilla HTML5, Vanilla CSS3 (custom variables, keyframes, transitions), Vanilla JavaScript (ES6+), FontAwesome Icons, Google Fonts (`Outfit`, `Inter`)

---

## 📝 License & Disclaimer

Data loaded from the official Google Cloud BigQuery Release Notes RSS Feed. This project is an independent tracker and is not affiliated with Google or Twitter/X.
