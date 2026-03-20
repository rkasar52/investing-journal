# 📈 Investing Journal

A personal stock tracking tool that keeps track of your positions, investment thesis, and uses AI to summarize the latest news for each stock — so you never lose track of why you bought something.

---

## What it does

- **Track positions** — ticker, buy price, shares, and your personal investment thesis
- **Weekly review queue** — your ~80 stocks are grouped into sets of 10, reviewed on a rotating weekly schedule
- **AI news refresh** — one click fetches the latest news for a stock and checks it against your thesis
- **Daily brief** — a curated 5–7 article summary relevant to your holdings, every morning
- **Portfolio chat** — ask open-ended questions like "what are my top losers this week?" and get AI answers
- **Analyst ratings** — track Zacks, Wall Street Zen, and Motley Fool ratings per position

---

## Before you start — what you'll need

You need to install two free tools before anything else. If you already have them, skip ahead.

### 1. Install Git
Git is how you download this code.

- Go to https://git-scm.com/downloads
- Download and install for your operating system
- To verify it worked, open Terminal (Mac) or Command Prompt (Windows) and type:
  ```
  git --version
  ```
  You should see a version number.

### 2. Install Python
Python runs the backend of this app.

- Go to https://www.python.org/downloads/
- Download the latest version (3.11 or higher)
- **On Windows:** during install, check the box that says "Add Python to PATH"
- To verify it worked:
  ```
  python3 --version
  ```

### 3. Install Node.js
Node.js is needed to build the frontend (the visual interface).

- Go to https://nodejs.org
- Download the **LTS** version (the left button)
- To verify it worked:
  ```
  node --version
  ```

---

## Step 1 — Get a Perplexity API key

Perplexity is the AI service that powers the news search and chat features. You need your own account and API key.

1. Go to https://www.perplexity.ai
2. Create a free account
3. Go to https://www.perplexity.ai/settings/api
4. Click **"Generate"** to create an API key — it looks like `pplx-xxxxxxxxxxxxxxxx`
5. Copy it — you'll need it in Step 4
6. Add credits to your account — go to the **"Credits"** section on the same settings page. **$20 is plenty** to start (covers hundreds of news lookups and chat messages)

---

## Step 2 — Download the code

Open Terminal (Mac) or Command Prompt (Windows) and run:

```bash
git clone https://github.com/YOUR_FRIENDS_USERNAME/investing-journal.git
cd investing-journal
```

> Replace `YOUR_FRIENDS_USERNAME` with the actual GitHub username who shared this with you.

---

## Step 3 — Set up the Python environment

This creates an isolated environment for the app's dependencies.

```bash
python3 -m venv .venv
```

Then activate it:

**Mac/Linux:**
```bash
source .venv/bin/activate
```

**Windows:**
```bash
.venv\Scripts\activate
```

You should see `(.venv)` appear at the start of your terminal line. Now install the dependencies:

```bash
pip install -r requirements.txt
```

---

## Step 4 — Add your API key

Create a file called `.env` in the project folder (same folder as `app.py`). You can do this in any text editor — just make sure the file is named exactly `.env` with no extension.

Paste this inside, replacing the value with your actual key from Step 1:

```
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxx
```

Save the file.

---

## Step 5 — Build the frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

This only needs to be done once (and again if the code is updated).

---

## Step 6 — Run the app

```bash
./start.sh
```

**Windows users** — run this instead:
```bash
python app.py
```

Then open your browser and go to: **http://localhost:5001**

That's it! You should see the dashboard.

---

## Every time you want to use the app

1. Open Terminal and navigate to the project folder:
   ```bash
   cd investing-journal
   ```
2. Activate the environment:
   ```bash
   source .venv/bin/activate   # Mac/Linux
   .venv\Scripts\activate      # Windows
   ```
3. Start the app:
   ```bash
   ./start.sh
   ```
4. Go to **http://localhost:5001** in your browser

---

## Keeping track of API costs

In the top-right corner of the app, there's a small credit usage indicator showing how much of your Perplexity budget you've used. Click it to see a breakdown by feature. You can update your budget there too when you add more credits.

---

## Updating when new features are added

If the person who shared this pushes updates to GitHub, you can pull them down:

```bash
git pull
cd frontend && npm run build && cd ..
```

Then restart the app.

---

## Troubleshooting

**"command not found: python3"**
Make sure Python is installed and added to PATH. On Windows try `python` instead of `python3`.

**"Port 5001 already in use"**
The app is already running in another terminal window, or a previous session didn't close cleanly. Run:
```bash
lsof -ti :5001 | xargs kill -9
```

**News refresh isn't working**
Double-check your `.env` file — make sure the API key is correct and has no extra spaces. Also make sure your Perplexity account has credits.

**The page looks broken / blank**
You may have skipped Step 5. Run the frontend build again:
```bash
cd frontend && npm run build && cd ..
```
