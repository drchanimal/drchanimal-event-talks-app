# BigQuery Release Hub 🚀

A modern, responsive web application to track, filter, and share Google BigQuery release notes. Built using a Python Flask backend and a plain vanilla HTML/CSS/JavaScript frontend, it fetches notes directly from the official Google Cloud feed, organizes them, and includes a built-in interactive Twitter (X) composer.

---

## ✨ Features

- **Daily Note Splitting**: Google bundles all updates for a single day into a single feed item. The server parses the underlying HTML and splits it using `<h3>` tags so that every feature, bug fix, or deprecation is isolated as a standalone card.
- **Categorization & Badging**: Automatically classifies updates into color-coded categories (`Feature`, `Deprecated`, `Changed`, `Fixed`, `Other`).
- **Real-Time Client Filtering**: Search by keyword or filter by update type instantly without reloading the page.
- **Robust Cache Layer**: Caches the parsed XML feed for 5 minutes (`300 seconds`) in-memory. Clicking the **Refresh** button bypasses the cache to fetch a live feed.
- **Graceful Network Recovery**: In case of connection failures to Google Cloud's RSS servers, the backend automatically serves stale cached data with a warning flag instead of crashing.
- **Interactive Tweet Composer**: Click on any card to slide open a Twitter composer panel. It auto-drafts a concise summary, limits inputs to 280 characters with an animated progress ring, and integrates with Twitter's Web Intent interface.

---

## 🛠️ Technology Stack

- **Backend**: Python 3, Flask
- **Frontend**: HTML5, Vanilla JavaScript (ES6+), Vanilla CSS3
- **Fonts**: Outfit (headings), Inter (body) from Google Fonts
- **Icons**: Optimized inline SVGs

---

## 📁 Directory Structure

```text
├── app.py                # Flask application, caching, and XML parser
├── requirements.txt      # Python dependencies
├── .gitignore            # Git exclusion rules
├── templates/
│   └── index.html        # Front-end structure & side-drawer composer
└── static/
    ├── css/
    │   └── style.css     # Glassmorphic dark-theme design styles
    └── js/
        └── app.js        # API caller, search filters, state & compose handler
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have **Python 3.9+** and `pip` installed.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/drchanimal/drchanimal-event-talks-app.git
   cd drchanimal-event-talks-app
   ```

2. **Install dependencies:**
   ```bash
   pip3 install -r requirements.txt
   ```

3. **Run the Flask application:**
   ```bash
   python3 app.py
   ```

4. **Open in browser:**
   Open your browser and navigate to:
   👉 **`http://127.0.0.1:5001`**

---

## 🐦 Using the Tweet Composer

1. Hover over any release card and click **Tweet** (or click the card itself).
2. The side drawer will slide open, displaying the selected release detail.
3. The editor automatically drafts your tweet structure (including date, description snippet, URL, and hashtags).
4. Edit the text in the text area. The circular progress tracker will fill up as you type.
   - **Cyan**: Normal
   - **Amber**: Less than 20 characters remaining
   - **Red**: Exceeded 280-character limit (the **Post to X** button will disable)
5. Click **Post to X** to open a secure Twitter share dialog.

---

## 🔒 License

This project is open-source. Feel free to copy, modify, and distribute it.
