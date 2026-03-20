import json
from datetime import date, datetime, timedelta
from pathlib import Path
from flask import Flask, jsonify, request
from flask_cors import CORS
from sqlalchemy import func, select, text

from models import db, Position, ThesisUpdate, NewsUpdate, ReviewGroup, Goal, DailyBrief, APIUsageLog, Setting
from services.prices import get_current_price, refresh_prices_for_all
from services.perplexity import refresh_news_for_position, chat_with_portfolio, fetch_daily_brief
from services.ratings import fetch_zacks_rating

BASE_DIR = Path(__file__).resolve().parent


def create_app():
    app = Flask(__name__, static_folder='frontend/dist', static_url_path='')
    app.config['SECRET_KEY'] = 'dev-secret-change-me'
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{BASE_DIR / "journal.db"}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    with app.app_context():
        db.create_all()
        # Migrate: add rating columns if they don't exist yet
        _migrate_add_columns(app)

    # ── Serve React app ──────────────────────────────────────────────────────
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react(path):
        import os
        dist_dir = BASE_DIR / 'frontend' / 'dist'
        file_path = dist_dir / path
        if path and file_path.exists():
            return app.send_static_file(path)
        index = dist_dir / 'index.html'
        if index.exists():
            return app.send_static_file('index.html')
        return jsonify({'status': 'API running — build the React frontend first'}), 200

    # ── Dashboard ────────────────────────────────────────────────────────────
    @app.route('/api/dashboard')
    def dashboard():
        pos_count = db.session.scalar(select(func.count(Position.id)))
        total_cost = db.session.scalar(
            select(func.coalesce(func.sum(Position.buy_price * Position.shares), 0.0))
        ) or 0.0
        total_value = db.session.scalar(
            select(func.coalesce(func.sum(Position.current_price * Position.shares), 0.0))
        ) or 0.0
        total_pl = total_value - total_cost
        total_pl_pct = (total_pl / total_cost * 100) if total_cost else 0.0

        positions = db.session.scalars(select(Position)).all()
        winners = sum(1 for p in positions if p.pl() > 0)
        losers = sum(1 for p in positions if p.pl() < 0)

        # All-time top gainers/losers by P/L %
        sorted_by_pct = sorted(positions, key=lambda p: p.pl_pct(), reverse=True)
        top_gainers = [p.to_dict() for p in sorted_by_pct[:5] if p.pl_pct() > 0]
        top_losers = [p.to_dict() for p in sorted_by_pct[-5:] if p.pl_pct() < 0]

        # Today's movers by daily change %
        with_daily = [p for p in positions if p.daily_change_pct is not None]
        sorted_daily = sorted(with_daily, key=lambda p: p.daily_change_pct, reverse=True)
        daily_winners = [p.to_dict() for p in sorted_daily[:5] if p.daily_change_pct > 0]
        daily_losers = [p.to_dict() for p in sorted_daily[-5:] if p.daily_change_pct < 0]

        # Next group due for review
        next_group = db.session.scalar(
            select(ReviewGroup).order_by(ReviewGroup.review_by_date)
        )

        return jsonify({
            'pos_count': pos_count,
            'total_cost': round(total_cost, 2),
            'total_value': round(total_value, 2),
            'total_pl': round(total_pl, 2),
            'total_pl_pct': round(total_pl_pct, 2),
            'winners': winners,
            'losers': losers,
            'top_gainers': top_gainers,
            'top_losers': top_losers[::-1],
            'daily_winners': daily_winners,
            'daily_losers': daily_losers[::-1],
            'next_review_group': next_group.to_dict() if next_group else None,
        })

    # ── Positions ────────────────────────────────────────────────────────────
    @app.route('/api/positions', methods=['GET'])
    def list_positions():
        positions = db.session.scalars(select(Position).order_by(Position.ticker)).all()
        return jsonify([p.to_dict() for p in positions])

    @app.route('/api/positions', methods=['POST'])
    def create_position():
        data = request.get_json()
        p = Position(
            ticker=data['ticker'].upper().strip(),
            buy_date=_parse_date(data.get('buy_date')),
            buy_price=float(data['buy_price']) if data.get('buy_price') else None,
            shares=float(data.get('shares', 0)),
            initial_thesis=data.get('initial_thesis'),
            target_price=float(data['target_price']) if data.get('target_price') else None,
            target_date=_parse_date(data.get('target_date')),
            goal_note=data.get('goal_note'),
        )
        price, daily_chg = get_current_price(p.ticker)
        p.current_price = price
        p.daily_change_pct = daily_chg
        p.last_price_refresh = date.today()
        db.session.add(p)
        db.session.commit()
        return jsonify(p.to_dict()), 201

    @app.route('/api/positions/<int:pid>', methods=['GET'])
    def get_position(pid):
        p = db.session.get(Position, pid)
        if not p:
            return jsonify({'error': 'Not found'}), 404
        data = p.to_dict()
        data['thesis_updates'] = [tu.to_dict() for tu in sorted(p.thesis_updates, key=lambda u: u.update_date, reverse=True)]
        data['news_updates'] = [nu.to_dict() for nu in p.news_updates]
        return jsonify(data)

    @app.route('/api/positions/<int:pid>', methods=['PUT'])
    def update_position(pid):
        p = db.session.get(Position, pid)
        if not p:
            return jsonify({'error': 'Not found'}), 404
        data = request.get_json()
        if 'ticker' in data:
            p.ticker = data['ticker'].upper().strip()
        if 'buy_date' in data:
            p.buy_date = _parse_date(data['buy_date'])
        if 'buy_price' in data:
            p.buy_price = float(data['buy_price']) if data['buy_price'] else None
        if 'shares' in data:
            p.shares = float(data['shares'])
        if 'initial_thesis' in data:
            p.initial_thesis = data['initial_thesis']
        if 'target_price' in data:
            p.target_price = float(data['target_price']) if data['target_price'] else None
        if 'target_date' in data:
            p.target_date = _parse_date(data['target_date'])
        if 'goal_note' in data:
            p.goal_note = data['goal_note']
        if 'zacks_rating' in data:
            p.zacks_rating = data['zacks_rating'] or None
        if 'wsz_rating' in data:
            p.wsz_rating = data['wsz_rating'] or None
        if 'motley_fool_rating' in data:
            p.motley_fool_rating = data['motley_fool_rating'] or None
        db.session.commit()
        return jsonify(p.to_dict())

    @app.route('/api/positions/<int:pid>', methods=['DELETE'])
    def delete_position(pid):
        p = db.session.get(Position, pid)
        if not p:
            return jsonify({'error': 'Not found'}), 404
        db.session.delete(p)
        db.session.commit()
        return jsonify({'deleted': pid})

    # ── News refresh ─────────────────────────────────────────────────────────
    @app.route('/api/positions/<int:pid>/refresh-news', methods=['POST'])
    def refresh_news(pid):
        p = db.session.get(Position, pid)
        if not p:
            return jsonify({'error': 'Not found'}), 404
        try:
            news_update, pt, ct, cost = refresh_news_for_position(p)
            db.session.add(news_update)
            db.session.add(APIUsageLog(call_type='news_refresh', ticker=p.ticker, prompt_tokens=pt, completion_tokens=ct, estimated_cost=cost))
            db.session.commit()
            return jsonify(news_update.to_dict())
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # ── Thesis updates ───────────────────────────────────────────────────────
    @app.route('/api/positions/<int:pid>/thesis-updates', methods=['POST'])
    def add_thesis_update(pid):
        p = db.session.get(Position, pid)
        if not p:
            return jsonify({'error': 'Not found'}), 404
        data = request.get_json()
        today = date.today()
        tu = ThesisUpdate(
            position_id=pid,
            update_date=_parse_date(data.get('update_date')) or today,
            quarter_label=data.get('quarter_label') or _infer_quarter(today),
            update_text=data['update_text'],
            rating=data.get('rating'),
            action=data.get('action'),
            price_at_update=p.current_price,
        )
        db.session.add(tu)
        db.session.commit()
        return jsonify(tu.to_dict()), 201

    # ── Prices ───────────────────────────────────────────────────────────────
    @app.route('/api/prices/refresh', methods=['POST'])
    def refresh_all_prices():
        count = refresh_prices_for_all()
        return jsonify({'updated': count})

    @app.route('/api/positions/<int:pid>/refresh-price', methods=['POST'])
    def refresh_single_price(pid):
        p = db.session.get(Position, pid)
        if not p:
            return jsonify({'error': 'Not found'}), 404
        price, daily_chg = get_current_price(p.ticker)
        p.current_price = price
        p.daily_change_pct = daily_chg
        p.last_price_refresh = date.today()
        db.session.commit()
        return jsonify({'ticker': p.ticker, 'current_price': price})

    # ── Review Groups ────────────────────────────────────────────────────────
    @app.route('/api/review-groups', methods=['GET'])
    def list_review_groups():
        groups = db.session.scalars(
            select(ReviewGroup).order_by(ReviewGroup.review_by_date)
        ).all()
        return jsonify([g.to_dict() for g in groups])

    @app.route('/api/review-groups/auto-assign', methods=['POST'])
    def auto_assign_groups():
        """Split all unassigned positions into groups of 10 with weekly cadence."""
        # Find positions not in any group
        all_positions = db.session.scalars(
            select(Position).order_by(Position.ticker)
        ).all()
        unassigned = [p for p in all_positions if not p.review_groups]

        if not unassigned:
            return jsonify({'message': 'All positions already assigned', 'groups_created': 0})

        # Find the latest existing review_by_date to append after
        latest_date_row = db.session.scalar(
            select(func.max(ReviewGroup.review_by_date))
        )
        if latest_date_row:
            next_date = latest_date_row + timedelta(weeks=1)
        else:
            next_date = date.today()

        existing_count = db.session.scalar(select(func.count(ReviewGroup.id))) or 0
        groups_created = 0
        chunk_size = 10

        for i in range(0, len(unassigned), chunk_size):
            chunk = unassigned[i:i + chunk_size]
            group_num = existing_count + groups_created + 1
            g = ReviewGroup(
                name=f'Group {group_num}',
                review_by_date=next_date + timedelta(weeks=groups_created),
            )
            g.positions = chunk
            db.session.add(g)
            groups_created += 1

        db.session.commit()
        return jsonify({'groups_created': groups_created})

    @app.route('/api/review-groups/<int:gid>', methods=['GET'])
    def get_review_group(gid):
        g = db.session.get(ReviewGroup, gid)
        if not g:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(g.to_dict(include_positions=True))

    @app.route('/api/review-groups/<int:gid>', methods=['PUT'])
    def update_review_group(gid):
        g = db.session.get(ReviewGroup, gid)
        if not g:
            return jsonify({'error': 'Not found'}), 404
        data = request.get_json()
        if 'name' in data:
            g.name = data['name']
        if 'review_by_date' in data:
            g.review_by_date = _parse_date(data['review_by_date'])
        db.session.commit()
        return jsonify(g.to_dict())

    @app.route('/api/review-groups/<int:gid>/finish', methods=['POST'])
    def finish_review_group(gid):
        """Mark group as reviewed and push it to the bottom of the queue."""
        g = db.session.get(ReviewGroup, gid)
        if not g:
            return jsonify({'error': 'Not found'}), 404

        total_groups = db.session.scalar(select(func.count(ReviewGroup.id))) or 1
        max_date = db.session.scalar(select(func.max(ReviewGroup.review_by_date)))

        g.last_reviewed_date = date.today()
        # Push to bottom: after the last group's date + 1 week
        g.review_by_date = (max_date or date.today()) + timedelta(weeks=1)

        db.session.commit()
        return jsonify(g.to_dict())

    @app.route('/api/review-groups', methods=['POST'])
    def create_review_group():
        data = request.get_json()
        g = ReviewGroup(
            name=data['name'],
            review_by_date=_parse_date(data['review_by_date']) or date.today(),
        )
        if 'position_ids' in data:
            positions = db.session.scalars(
                select(Position).where(Position.id.in_(data['position_ids']))
            ).all()
            g.positions = positions
        db.session.add(g)
        db.session.commit()
        return jsonify(g.to_dict(include_positions=True)), 201

    @app.route('/api/review-groups/<int:gid>/positions', methods=['POST'])
    def add_position_to_group(gid):
        g = db.session.get(ReviewGroup, gid)
        if not g:
            return jsonify({'error': 'Not found'}), 404
        data = request.get_json()
        pid = data.get('position_id')
        p = db.session.get(Position, pid)
        if not p:
            return jsonify({'error': 'Position not found'}), 404
        if p not in g.positions:
            g.positions.append(p)
            db.session.commit()
        return jsonify(g.to_dict(include_positions=True))

    @app.route('/api/review-groups/<int:gid>/positions/<int:pid>', methods=['DELETE'])
    def remove_position_from_group(gid, pid):
        g = db.session.get(ReviewGroup, gid)
        if not g:
            return jsonify({'error': 'Not found'}), 404
        p = db.session.get(Position, pid)
        if p and p in g.positions:
            g.positions.remove(p)
            db.session.commit()
        return jsonify(g.to_dict(include_positions=True))

    # ── Chat ─────────────────────────────────────────────────────────────────
    @app.route('/api/chat', methods=['POST'])
    def chat():
        data = request.get_json()
        message = data.get('message', '').strip()
        history = data.get('history', [])
        if not message:
            return jsonify({'error': 'No message provided'}), 400
        positions = db.session.scalars(select(Position)).all()
        context = _build_portfolio_context(positions)
        try:
            reply, pt, ct, cost = chat_with_portfolio(message, history, context)
            db.session.add(APIUsageLog(call_type='chat', prompt_tokens=pt, completion_tokens=ct, estimated_cost=cost))
            db.session.commit()
            return jsonify({'reply': reply})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # ── Daily Brief ──────────────────────────────────────────────────────────
    @app.route('/api/daily-brief', methods=['GET'])
    def get_daily_brief():
        today = date.today()
        brief = db.session.scalar(
            select(DailyBrief).where(DailyBrief.brief_date == today)
        )
        if brief:
            return jsonify(brief.to_dict())
        return jsonify(None)

    @app.route('/api/daily-brief/refresh', methods=['POST'])
    def refresh_daily_brief():
        tickers = [p.ticker for p in db.session.scalars(select(Position)).all()]
        if not tickers:
            return jsonify({'error': 'No positions found'}), 400
        try:
            result, pt, ct, cost = fetch_daily_brief(tickers)
        except Exception as e:
            return jsonify({'error': str(e)}), 500

        today = date.today()
        existing = db.session.scalar(select(DailyBrief).where(DailyBrief.brief_date == today))
        if existing:
            db.session.delete(existing)

        brief = DailyBrief(
            brief_date=today,
            market_summary=result.get('market_summary', ''),
            articles=json.dumps(result.get('articles', [])),
        )
        db.session.add(brief)
        db.session.add(APIUsageLog(call_type='daily_brief', prompt_tokens=pt, completion_tokens=ct, estimated_cost=cost))
        db.session.commit()
        return jsonify(brief.to_dict())

    # ── Usage ────────────────────────────────────────────────────────────────
    @app.route('/api/usage', methods=['GET'])
    def get_usage():
        logs = db.session.scalars(select(APIUsageLog).order_by(APIUsageLog.created_at.desc())).all()
        total_cost = sum(l.estimated_cost for l in logs)
        by_type = {}
        for l in logs:
            t = l.call_type
            if t not in by_type:
                by_type[t] = {'count': 0, 'cost': 0.0}
            by_type[t]['count'] += 1
            by_type[t]['cost'] = round(by_type[t]['cost'] + l.estimated_cost, 6)
        budget_setting = db.session.get(Setting, 'perplexity_budget')
        budget = float(budget_setting.value) if budget_setting else 20.0
        return jsonify({
            'total_cost': round(total_cost, 4),
            'total_calls': len(logs),
            'by_type': by_type,
            'budget': budget,
            'remaining': round(budget - total_cost, 4),
        })

    @app.route('/api/usage/budget', methods=['PUT'])
    def update_budget():
        data = request.get_json()
        budget = float(data.get('budget', 20.0))
        setting = db.session.get(Setting, 'perplexity_budget')
        if setting:
            setting.value = str(budget)
        else:
            db.session.add(Setting(key='perplexity_budget', value=str(budget)))
        db.session.commit()
        return jsonify({'budget': budget})

    # ── Ratings ──────────────────────────────────────────────────────────────
    @app.route('/api/positions/<int:pid>/refresh-ratings', methods=['POST'])
    def refresh_ratings(pid):
        p = db.session.get(Position, pid)
        if not p:
            return jsonify({'error': 'Not found'}), 404
        zacks = fetch_zacks_rating(p.ticker)
        if zacks:
            p.zacks_rating = zacks
        p.ratings_updated = datetime.utcnow()
        db.session.commit()
        return jsonify({
            'zacks_rating': p.zacks_rating,
            'wsz_rating': p.wsz_rating,
            'motley_fool_rating': p.motley_fool_rating,
            'ratings_updated': p.ratings_updated.isoformat(),
            'zacks_fetched': zacks is not None,
        })

    return app


# ── Helpers ──────────────────────────────────────────────────────────────────
def _migrate_add_columns(app):
    """Add new columns to existing SQLite tables without dropping data."""
    new_cols = [
        ('positions', 'zacks_rating', 'VARCHAR(32)'),
        ('positions', 'wsz_rating', 'VARCHAR(32)'),
        ('positions', 'motley_fool_rating', 'VARCHAR(32)'),
        ('positions', 'ratings_updated', 'DATETIME'),
        ('positions', 'daily_change_pct', 'FLOAT'),
    ]
    with app.app_context():
        with db.engine.connect() as conn:
            for table, col, col_type in new_cols:
                try:
                    conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {col} {col_type}'))
                    conn.commit()
                except Exception:
                    pass  # Column already exists


def _build_portfolio_context(positions) -> str:
    """Build a compact portfolio context string for AI chat."""
    from datetime import date as _date
    today = _date.today().isoformat()

    total_cost = sum(p.cost_basis() for p in positions)
    total_value = sum(p.market_value() for p in positions)
    total_pl = total_value - total_cost
    total_pl_pct = (total_pl / total_cost * 100) if total_cost else 0

    lines = [
        f"PORTFOLIO CONTEXT (as of {today})",
        f"Total positions: {len(positions)} | "
        f"Cost: ${total_cost:,.0f} | Value: ${total_value:,.0f} | "
        f"P/L: ${total_pl:+,.0f} ({total_pl_pct:+.1f}%)",
        "",
        "POSITIONS (ticker | shares | cost | price | all-time P/L% | today | zacks | wsz | motley fool):",
    ]
    for p in sorted(positions, key=lambda x: x.ticker):
        daily = f"{p.daily_change_pct:+.1f}%" if p.daily_change_pct is not None else "—"
        lines.append(
            f"{p.ticker:6s} | {p.shares or 0:.1f}sh | "
            f"${p.buy_price or 0:.2f} | ${p.current_price or 0:.2f} | "
            f"{p.pl_pct():+.1f}% | {daily} | "
            f"{p.zacks_rating or '—'} | {p.wsz_rating or '—'} | {p.motley_fool_rating or '—'}"
        )

    lines += ["", "INVESTMENT THESES:"]
    for p in sorted(positions, key=lambda x: x.ticker):
        thesis = (p.initial_thesis or 'No thesis recorded.')[:200]
        lines.append(f"{p.ticker}: {thesis}")

    # Include latest news summary per position (one-liner)
    lines += ["", "LATEST NEWS REFRESH (one-liner per position):"]
    for p in sorted(positions, key=lambda x: x.ticker):
        news = p.latest_news()
        if news and news.news_content:
            snippet = news.news_content.replace('\n', ' ')[:180]
            lines.append(f"{p.ticker}: {snippet}")

    return "\n".join(lines)


def _parse_date(value) -> date | None:
    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value))
    except Exception:
        return None


def _infer_quarter(d: date) -> str:
    q = (d.month - 1) // 3 + 1
    return f"{d.year}-Q{q}"


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5001)
