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

    # Get recent notes for context
    recent_notes = sorted(position.notes, key=lambda n: n.created_at, reverse=True)[:5] if hasattr(position, 'notes') else []
    notes_text = '\n'.join(
        f"- {n.created_at.strftime('%Y-%m-%d')}: {n.note_text}"
        for n in recent_notes
    ) if recent_notes else ''

    # Build analyst rating context
    rating_parts = []
    if getattr(position, 'zacks_rating', None):
        note = f" ({position.zacks_notes})" if getattr(position, 'zacks_notes', None) else ''
        rating_parts.append(f"Zacks: {position.zacks_rating}{note}")
    if getattr(position, 'wsz_rating', None):
        note = f" ({position.wsz_notes})" if getattr(position, 'wsz_notes', None) else ''
        rating_parts.append(f"Wall Street Zen: {position.wsz_rating}{note}")
    if getattr(position, 'motley_fool_rating', None):
        note = f" ({position.motley_fool_notes})" if getattr(position, 'motley_fool_notes', None) else ''
        rating_parts.append(f"Motley Fool: {position.motley_fool_rating}{note}")
    ratings_text = ' | '.join(rating_parts) if rating_parts else ''

    prompt = f"""You are an investment research assistant. Search the web for recent news and developments about {ticker} stock.

IMPORTANT: Always provide a complete analysis using whatever information you can find. If recent news is limited, use the most recent available information, sector trends, or known company context. Never refuse or say results are insufficient — just work with what's available and note any limitations briefly.

## Latest News Summary
Search for and summarize the most important recent news for {ticker}. Include anything relevant: earnings, analyst actions, product/regulatory news, competitive developments, macro factors. If news is sparse, summarize the general recent situation and sector context.

## Thesis Check
My investment thesis: {thesis if thesis else 'No thesis recorded yet.'}
My goal: {goal if goal else 'No specific goal set.'}
{f'My analyst ratings: {ratings_text}{chr(10)}' if ratings_text else ''}{f'My recent notes:{chr(10)}{notes_text}{chr(10)}' if notes_text else ''}
Based on what you found:
- Does the recent news SUPPORT or CHALLENGE this thesis?
- Overall sentiment: Bullish / Neutral / Bearish?
- Any red flags or catalysts worth acting on?

## Action Suggestion
Recommended action: HOLD / ADD / TRIM / WATCH CLOSELY — with a 1-2 sentence rationale.

Be direct and concise. Always complete all three sections."""

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


def research_goal_for_position(position) -> tuple[str, int, int, float]:
    """
    Research a stock to help the investor set a long-term goal and target price.
    Returns (research_text, prompt_tokens, completion_tokens, estimated_cost).
    """
    ticker = position.ticker
    thesis = position.initial_thesis or ''
    current_price = position.current_price or 0
    buy_price = position.buy_price or 0

    prompt = f"""You are an investment research analyst. I own {ticker} stock and need help setting a long-term investment goal and target price.

Current situation:
- My buy price: ${buy_price:.2f}
- Current price: ${current_price:.2f}
- My investment thesis: {thesis if thesis else 'Not yet defined.'}

Please research {ticker} and provide the following:

## Analyst Price Targets
What are current Wall Street analyst price targets for {ticker}? Include the range (low / average / high) and consensus rating if available.

## Long-Term Growth Case
What are the 2-3 strongest long-term growth drivers for {ticker} over the next 3-5 years? Be specific to this company.

## Key Risks to the Thesis
What are the 2-3 biggest risks that could prevent {ticker} from reaching its potential?

## Suggested Goal Framework
Based on the above, suggest:
- A **conservative target price** (realistic base case, 2-3 years)
- An **optimistic target price** (bull case if growth drivers play out)
- A **suggested exit trigger** — what specific event or condition should prompt a sell decision?

Be direct and specific. Use real analyst data where available. This is to help me set a concrete goal, not a generic overview."""

    payload = {
        'model': 'sonar-pro',
        'messages': [
            {'role': 'system', 'content': 'You are a professional equity research analyst. Be specific, data-driven, and direct. Always complete all sections even if data is limited — use your best judgment.'},
            {'role': 'user', 'content': prompt},
        ],
        'temperature': 0.2,
        'max_tokens': 1500,
    }

    result, pt, ct, cost = _call(payload)
    content = result['choices'][0]['message']['content']
    return content, pt, ct, cost


def chat_about_position(position, news_update, message: str, history: list) -> tuple[str, int, int, float]:
    """
    Chat about a specific position, with its thesis and latest news as context.
    Returns (reply_text, prompt_tokens, completion_tokens, estimated_cost).
    """
    ticker = position.ticker

    # Build position-specific context
    rating_parts = []
    for src, rating, notes in [
        ('Zacks', getattr(position, 'zacks_rating', None), getattr(position, 'zacks_notes', None)),
        ('Wall Street Zen', getattr(position, 'wsz_rating', None), getattr(position, 'wsz_notes', None)),
        ('Motley Fool', getattr(position, 'motley_fool_rating', None), getattr(position, 'motley_fool_notes', None)),
    ]:
        if rating:
            note_str = f' ({notes})' if notes else ''
            rating_parts.append(f'{src}: {rating}{note_str}')

    context_parts = [
        f"STOCK: {ticker}",
        f"Shares: {position.shares} | Buy price: ${position.buy_price or 0:.2f} | "
        f"Current: ${position.current_price or 0:.2f} | "
        f"P/L: {position.pl_pct():+.1f}%",
    ]
    if position.initial_thesis:
        context_parts.append(f"\nINVESTMENT THESIS:\n{position.initial_thesis}")
    if position.goal_note:
        context_parts.append(f"\nGOAL / EXIT CRITERIA:\n{position.goal_note}")
    if rating_parts:
        context_parts.append(f"\nANALYST RATINGS: {' | '.join(rating_parts)}")
    if getattr(position, 'retirement_hold', False):
        context_parts.append("\nHORIZON: Long-term retirement hold")

    if news_update:
        context_parts.append(f"\nLATEST NEWS ANALYSIS (fetched {news_update.created_at.strftime('%Y-%m-%d')}):")
        if news_update.news_content:
            context_parts.append(news_update.news_content)
        if news_update.thesis_analysis:
            context_parts.append(news_update.thesis_analysis)

    system_prompt = (
        f"You are a personal investment advisor helping an investor think through their {ticker} position. "
        f"You have full context on this stock below. Answer questions directly and practically. "
        f"Be concise — the investor wants actionable insight, not lengthy disclaimers.\n\n"
        + '\n'.join(context_parts)
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
