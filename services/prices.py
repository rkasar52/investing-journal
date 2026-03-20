from datetime import date
from yahooquery import Ticker
from models import db, Position


def get_current_price(ticker: str) -> tuple[float, float | None]:
    """Returns (current_price, daily_change_pct). daily_change_pct may be None."""
    try:
        t = Ticker(ticker)
        info = t.price.get(ticker.upper(), {})
        price = float(info.get('regularMarketPrice', 0)) or None
        change_pct = info.get('regularMarketChangePercent')
        daily = round(float(change_pct) * 100, 2) if change_pct is not None else None
        return price, daily
    except Exception as e:
        print(f"Error fetching price for {ticker}: {e}")
        return None, None


def refresh_prices_for_all() -> int:
    """Batch refresh prices + daily change for all positions."""
    positions = db.session.scalars(db.select(Position)).all()
    if not positions:
        return 0

    tickers = [p.ticker.upper() for p in positions]
    try:
        prices = Ticker(tickers).price
    except Exception as e:
        print(f"Failed to fetch batch prices: {e}")
        return 0

    updated = 0
    for p in positions:
        info = prices.get(p.ticker.upper()) if isinstance(prices, dict) else None
        if info and 'regularMarketPrice' in info:
            try:
                p.current_price = float(info['regularMarketPrice'])
                change_pct = info.get('regularMarketChangePercent')
                p.daily_change_pct = round(float(change_pct) * 100, 2) if change_pct is not None else None
                p.last_price_refresh = date.today()
                updated += 1
            except Exception:
                print(f"Could not update price for {p.ticker}")

    db.session.commit()
    return updated
