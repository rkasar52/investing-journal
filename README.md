# Investing Journal

Personal stock tracking tool with AI news analysis, thesis tracking, and a weekly review queue.

> **Want to use this?** You need an API key from me first — reach out and I'll get you one.

---

## Setup

**You'll need:** Git, Python 3.11+, Node.js (LTS)

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/investing-journal.git
cd investing-journal

# 2. Python environment
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 3. Add your API key (get this from me)
echo "PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxx" > .env

# 4. Build the frontend
cd frontend && npm install && npm run build && cd ..

# 5. Run
./start.sh                       # Windows: python app.py
```

Open **http://localhost:5001**

---

## Starting the app after first setup

```bash
source .venv/bin/activate
./start.sh
```

---

## Troubleshooting

**Port 5001 already in use**
```bash
lsof -ti :5001 | xargs kill -9
```

**Page is blank** — re-run the frontend build:
```bash
cd frontend && npm run build && cd ..
```

**News not working** — check your `.env` file has the correct API key with no extra spaces.

---

## Pulling updates

```bash
git pull
cd frontend && npm run build && cd ..
```
