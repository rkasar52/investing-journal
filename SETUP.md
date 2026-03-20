# Investing Journal — Setup & Usage

## Prerequisites
- Python 3.11+
- Node.js 18+
- A Perplexity API key (perplexity.ai)

## First-Time Setup

### 1. Python environment
```bash
cd ~/Documents/investing-journal
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Environment variables
Create a `.env` file in the project root (already exists if you've used this before):
```
OPENAI_API_KEY=your_openai_key
PERPLEXITY_API_KEY=your_perplexity_key
```

### 3. Frontend build
```bash
cd frontend
npm install
npm run build
cd ..
```

---

## Running the App

### Option A — Production (single terminal)
Flask serves the built React app on port 5001.
```bash
source .venv/bin/activate
./start.sh
```
Open: http://localhost:5001

### Option B — Development (two terminals, hot reload)
**Terminal 1 — Backend:**
```bash
source .venv/bin/activate
python app.py
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
Open: http://localhost:5173

> Tip: After editing any frontend file, Option B reflects changes instantly without rebuilding.
> For Option A, run `cd frontend && npm run build` to pick up frontend changes.

---

## Weekly Workflow

1. **Open the app** → Dashboard shows portfolio summary and next review group due
2. **Go to Review Queue** → The group at the top is your current week's batch
3. **Click "Start Review"** → Opens ~10 stocks
4. **For each stock**, click **"Fetch News"** — Perplexity searches the web and analyzes the latest news against your investment thesis
5. **Read the analysis**, optionally add a manual Thesis Update note
6. **Click "✓ Finish Review"** → Group moves to the bottom of the queue (due again in ~8 weeks)

---

## Managing Positions

- **Add a position:** Click **+ Add Position** in the top nav
- **Edit a position:** Open the position → click **Edit**, or click Edit in the Positions table
- **Delete a position:** Positions table → Del button
- **Auto-assign to review groups:** Review Queue → **Auto-Assign Positions** (splits all unassigned positions into groups of 10)

---

## Database

SQLite file at `journal.db` in the project root. All data persists locally — no cloud sync.

To back it up:
```bash
cp journal.db journal.db.backup
```
