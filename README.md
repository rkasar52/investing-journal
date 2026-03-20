# Investing Journal – Flask Starter

### Quickstart

```bash
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Visit http://127.0.0.1:5000 and start adding positions.

### Notes
- Prices are fetched via `yfinance` on create and when you click **Refresh Prices**.
- Quarterly review page highlights tickers missing an update for the current quarter label (YYYY-QN).
- This starter uses SQLite for simplicity (file: `journal.db`). You can switch to Postgres by setting `SQLALCHEMY_DATABASE_URI` in `app.py`.

### Roadmap Ideas
- Broker import (CSV): seed positions & transactions.
- Multiple lots per ticker & realized P/L tracking.
- Scheduled job (cron) to refresh prices daily.
- Tagging by themes (AI, Energy, etc.) and watchlists.
- Simple auth (Flask-Login) if you ever host it.
- Graphs for P/L over time and goal progress.
```
