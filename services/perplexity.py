import json
import os
import re
import requests
from datetime import datetime, date
from dotenv import load_dotenv

load_dotenv()

PERPLEXITY_API_KEY = os.getenv('PERPLEXITY_API_KEY')
API_URL = 'https://api.perplexity.ai/chat/completions'

# sonar-pro pricing (USD)
INPUT_COST_PER_TOKEN  = 3.0  / 1_000_000   # $3 per 1M input tokens
OUTPUT_COST_PER_TOKEN = 15.0 / 1_000_000   # $15 per 1M output tokens
COST_PER_REQUEST      = 5.0  / 1_000       # $5 per 1000 requests


def _calc_cost(prompt_tokens: int, completion_tokens: int) -> float:
    """Return estimated USD cost for one sonar-pro call."""
    return (
        prompt_tokens * INPUT_COST_PER_TOKEN
        + completion_tokens * OUTPUT_COST_PER_TOKEN
        + COST_PER_REQUEST
    )


def _call(payload: dict) -> tuple[dict, int, int, float]:
    """
    Make one Perplexity API call.
    Returns (result_json, prompt_tokens, completion_tokens, estimated_cost).
    """
    headers = {
        'Authorization': f'Bearer {PERPLEXITY_API_KEY}',
        'Content-Type': 'application/json',
    }
    response = requests.post(API_URL, headers=headers, json=payload, timeout=60)
    response.raise_for_status()
    result = response.json()
    usage = result.get('usage', {})
    pt = usage.get('prompt_tokens', 0)
    ct = usage.get('completion_tokens', 0)
    return result, pt, ct, _calc_cost(pt, ct)


def refresh_news_for_position(position) -> tuple['NewsUpdate', int, int, float]:
    """
    Fetch latest news + thesis analysis for a position.
    Returns (NewsUpdate, prompt_tokens, completion_tokens, estimated_cost).
    """
    from models import NewsUpdate

    ticker = position.ticker
    thesis = position.initial_thesis or ''
    goal = position.goal_note or ''

    prompt = f"""You are an investment research assistant. Search the web for the latest news and developments about {ticker} stock from the past 7 days.

Then provide a structured analysis in the following format:

## Latest News Summary
Summarize the 3-5 most important recent news items, events, or developments for {ticker}. Include earnings, analyst actions, product launches, regulatory news, or macro factors affecting this stock.

## Thesis Check
My investment thesis: {thesis}
My goal: {goal}

Based on the latest news, assess:
- Does the news SUPPORT or CHALLENGE the thesis?
- What is the overall sentiment (Bullish / Neutral / Bearish)?
- Are there any red flags or catalysts I should act on?

## Action Suggestion
Based on the current news and thesis, what action do you recommend: HOLD / ADD / TRIM / WATCH CLOSELY? Give a 1-2 sentence rationale.

Be concise and direct. Focus on what matters for an investor's decision."""

    payload = {
        'model': 'sonar-pro',
        'messages': [
            {'role': 'system', 'content': 'You are a professional investment research assistant. Be concise, factual, and focused on actionable insights for investors.'},
            {'role': 'user', 'content': prompt},
        ],
        'temperature': 0.2,
        'max_tokens': 1024,
    }

    result, pt, ct, cost = _call(payload)
    content = result['choices'][0]['message']['content']
    citations = result.get('citations', [])

    parts = content.split('## Thesis Check', 1)
    news_content = parts[0].replace('## Latest News Summary', '').strip()
    thesis_analysis = ('## Thesis Check\n' + parts[1]).strip() if len(parts) > 1 else content

    news_update = NewsUpdate(
        position_id=position.id,
        created_at=datetime.utcnow(),
        news_content=news_content,
        thesis_analysis=thesis_analysis,
        citations=json.dumps(citations),
    )

    return news_update, pt, ct, cost


def chat_with_portfolio(message: str, history: list, portfolio_context: str) -> tuple[str, int, int, float]:
    """
    Answer an open-ended portfolio question.
    Returns (reply_text, prompt_tokens, completion_tokens, estimated_cost).
    """
    system_prompt = (
        "You are a personal investment advisor for an individual investor. "
        "You have full access to their portfolio data below. "
        "Answer questions concisely and practically. Be direct — no fluff. "
        "Focus on what matters for decisions. When referencing specific stocks, "
        "use their actual data from the portfolio context.\n\n"
        + portfolio_context
    )

    messages = [{'role': 'system', 'content': system_prompt}]
    for msg in history[-10:]:
        messages.append({'role': msg['role'], 'content': msg['content']})
    messages.append({'role': 'user', 'content': message})

    payload = {
        'model': 'sonar-pro',
        'messages': messages,
        'temperature': 0.3,
        'max_tokens': 1024,
    }

    result, pt, ct, cost = _call(payload)
    return result['choices'][0]['message']['content'], pt, ct, cost


def fetch_daily_brief(tickers: list[str]) -> tuple[dict, int, int, float]:
    """
    Fetch a curated daily brief of 5-7 articles relevant to the portfolio.
    Returns (brief_dict, prompt_tokens, completion_tokens, estimated_cost).
    """
    ticker_str = ', '.join(tickers[:40])

    prompt = (
        f"Today is {date.today().strftime('%B %d, %Y')}. "
        f"I'm an individual investor with positions in: {ticker_str}.\n\n"
        "Search the web for today's most important financial news. "
        "Return ONLY a valid JSON object with this exact structure (no extra text):\n"
        '{\n'
        '  "market_summary": "2-3 sentence overview of today\'s market conditions",\n'
        '  "articles": [\n'
        '    {\n'
        '      "title": "Headline",\n'
        '      "source": "Publication name",\n'
        '      "url": "https://...",\n'
        '      "summary": "One sentence summary",\n'
        '      "relevance": "TICKER or theme like \'Tech sector\' or \'Fed/Macro\'"\n'
        '    }\n'
        '  ]\n'
        '}\n\n'
        "Include exactly 5-7 articles. Priority order:\n"
        "1. News directly about my holdings\n"
        "2. Sector news affecting multiple holdings\n"
        "3. Major macro/market news\n"
        "Be SELECTIVE — only genuinely important news, no filler."
    )

    payload = {
        'model': 'sonar-pro',
        'messages': [
            {'role': 'system', 'content': 'You are a financial news curator. Return only valid JSON, no markdown code blocks, no extra text.'},
            {'role': 'user', 'content': prompt},
        ],
        'temperature': 0.1,
        'max_tokens': 2048,
    }

    result, pt, ct, cost = _call(payload)
    content = result['choices'][0]['message']['content']

    cleaned = re.sub(r'^```(?:json)?\s*', '', content.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r'```\s*$', '', cleaned.strip(), flags=re.MULTILINE)
    try:
        brief = json.loads(cleaned)
    except json.JSONDecodeError:
        brief = {'market_summary': content, 'articles': []}

    return brief, pt, ct, cost
