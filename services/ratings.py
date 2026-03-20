"""
Ratings auto-fetch service.
- Zacks: uses their internal quote-feed JSON endpoint (no scraping needed)
- WSZ / Motley Fool: manual entry only
"""
import requests

ZACKS_RANK_LABELS = {
    '1': 'Strong Buy',
    '2': 'Buy',
    '3': 'Hold',
    '4': 'Sell',
    '5': 'Strong Sell',
}

HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/124.0.0.0 Safari/537.36'
    ),
    'Accept': 'application/json',
}


def fetch_zacks_rating(ticker: str) -> str | None:
    """
    Try to fetch the Zacks rank via their internal feed endpoint.
    Returns a label like 'Strong Buy' or None if unavailable.
    """
    ticker = ticker.upper()
    url = f'https://quote-feed.zacks.com/index?t={ticker}'
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        stock_data = data.get(ticker) or data.get(ticker.lower())
        if not stock_data:
            return None
        rank = str(stock_data.get('zacks_rank', '')).strip()
        return ZACKS_RANK_LABELS.get(rank)
    except Exception:
        return None
