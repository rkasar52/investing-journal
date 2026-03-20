from datetime import datetime, date
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Float, Text, Date, DateTime, ForeignKey, Table, Column

db = SQLAlchemy()

# Association table: many-to-many between ReviewGroup and Position
review_group_positions = Table(
    'review_group_positions',
    db.metadata,
    Column('group_id', ForeignKey('review_groups.id'), primary_key=True),
    Column('position_id', ForeignKey('positions.id'), primary_key=True)
)


class Position(db.Model):
    __tablename__ = 'positions'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticker: Mapped[str] = mapped_column(String(16), index=True)
    buy_date: Mapped[datetime] = mapped_column(Date, nullable=True)
    buy_price: Mapped[float] = mapped_column(Float, nullable=True)
    shares: Mapped[float] = mapped_column(Float, default=0)

    initial_thesis: Mapped[str] = mapped_column(Text, nullable=True)

    target_price: Mapped[float] = mapped_column(Float, nullable=True)
    target_date: Mapped[datetime] = mapped_column(Date, nullable=True)
    goal_note: Mapped[str] = mapped_column(Text, nullable=True)

    current_price: Mapped[float] = mapped_column(Float, nullable=True)
    daily_change_pct: Mapped[float] = mapped_column(Float, nullable=True)
    last_price_refresh: Mapped[datetime] = mapped_column(Date, nullable=True)

    # Analyst ratings
    zacks_rating: Mapped[str] = mapped_column(String(32), nullable=True)
    wsz_rating: Mapped[str] = mapped_column(String(32), nullable=True)
    motley_fool_rating: Mapped[str] = mapped_column(String(32), nullable=True)
    ratings_updated: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(Date, default=datetime.utcnow)

    thesis_updates: Mapped[list['ThesisUpdate']] = relationship(
        'ThesisUpdate', back_populates='position', cascade='all, delete-orphan'
    )
    goals: Mapped[list['Goal']] = relationship(
        'Goal', back_populates='position', cascade='all, delete-orphan'
    )
    news_updates: Mapped[list['NewsUpdate']] = relationship(
        'NewsUpdate', back_populates='position', cascade='all, delete-orphan',
        order_by='NewsUpdate.created_at.desc()'
    )
    review_groups: Mapped[list['ReviewGroup']] = relationship(
        'ReviewGroup', secondary=review_group_positions, back_populates='positions'
    )

    def cost_basis(self) -> float:
        if self.buy_price and self.shares:
            return float(self.buy_price) * float(self.shares)
        return 0.0

    def market_value(self) -> float:
        if self.current_price and self.shares:
            return float(self.current_price) * float(self.shares)
        return 0.0

    def pl(self) -> float:
        return self.market_value() - self.cost_basis()

    def pl_pct(self) -> float:
        cb = self.cost_basis()
        if cb == 0:
            return 0.0
        return (self.pl() / cb) * 100

    def latest_news(self) -> 'NewsUpdate | None':
        return self.news_updates[0] if self.news_updates else None

    def latest_update(self) -> 'ThesisUpdate | None':
        return max(self.thesis_updates, key=lambda u: u.update_date) if self.thesis_updates else None

    def to_dict(self) -> dict:
        latest_news = self.latest_news()
        return {
            'id': self.id,
            'ticker': self.ticker,
            'buy_date': self.buy_date.isoformat() if self.buy_date else None,
            'buy_price': self.buy_price,
            'shares': self.shares,
            'initial_thesis': self.initial_thesis,
            'target_price': self.target_price,
            'target_date': self.target_date.isoformat() if self.target_date else None,
            'goal_note': self.goal_note,
            'current_price': self.current_price,
            'last_price_refresh': self.last_price_refresh.isoformat() if self.last_price_refresh else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'cost_basis': self.cost_basis(),
            'market_value': self.market_value(),
            'pl': self.pl(),
            'pl_pct': self.pl_pct(),
            'daily_change_pct': self.daily_change_pct,
            'last_news_refresh': latest_news.created_at.isoformat() if latest_news else None,
            'zacks_rating': self.zacks_rating,
            'wsz_rating': self.wsz_rating,
            'motley_fool_rating': self.motley_fool_rating,
            'ratings_updated': self.ratings_updated.isoformat() if self.ratings_updated else None,
        }


class ThesisUpdate(db.Model):
    __tablename__ = 'thesis_updates'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    position_id: Mapped[int] = mapped_column(ForeignKey('positions.id'), index=True)
    update_date: Mapped[datetime] = mapped_column(Date)
    quarter_label: Mapped[str] = mapped_column(String(8), index=True)
    update_text: Mapped[str] = mapped_column(Text)
    rating: Mapped[int] = mapped_column(Integer, nullable=True)
    action: Mapped[str] = mapped_column(String(16), nullable=True)
    price_at_update: Mapped[float] = mapped_column(Float, nullable=True)

    position: Mapped[Position] = relationship('Position', back_populates='thesis_updates')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'position_id': self.position_id,
            'update_date': self.update_date.isoformat() if self.update_date else None,
            'quarter_label': self.quarter_label,
            'update_text': self.update_text,
            'rating': self.rating,
            'action': self.action,
            'price_at_update': self.price_at_update,
        }


class NewsUpdate(db.Model):
    __tablename__ = 'news_updates'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    position_id: Mapped[int] = mapped_column(ForeignKey('positions.id'), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    news_content: Mapped[str] = mapped_column(Text, nullable=True)
    thesis_analysis: Mapped[str] = mapped_column(Text, nullable=True)
    citations: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string of URLs

    position: Mapped[Position] = relationship('Position', back_populates='news_updates')

    def to_dict(self) -> dict:
        import json
        return {
            'id': self.id,
            'position_id': self.position_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'news_content': self.news_content,
            'thesis_analysis': self.thesis_analysis,
            'citations': json.loads(self.citations) if self.citations else [],
        }


class ReviewGroup(db.Model):
    __tablename__ = 'review_groups'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(64))
    review_by_date: Mapped[date] = mapped_column(Date)
    last_reviewed_date: Mapped[date] = mapped_column(Date, nullable=True)

    positions: Mapped[list[Position]] = relationship(
        'Position', secondary=review_group_positions, back_populates='review_groups'
    )

    def to_dict(self, include_positions: bool = False) -> dict:
        d = {
            'id': self.id,
            'name': self.name,
            'review_by_date': self.review_by_date.isoformat() if self.review_by_date else None,
            'last_reviewed_date': self.last_reviewed_date.isoformat() if self.last_reviewed_date else None,
            'position_count': len(self.positions),
        }
        if include_positions:
            d['positions'] = [p.to_dict() for p in self.positions]
        return d


class Setting(db.Model):
    __tablename__ = 'settings'
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text)


class APIUsageLog(db.Model):
    __tablename__ = 'api_usage_logs'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    call_type: Mapped[str] = mapped_column(String(32))   # news_refresh | chat | daily_brief
    ticker: Mapped[str] = mapped_column(String(16), nullable=True)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    # Cost in USD cents (stored as float for precision)
    estimated_cost: Mapped[float] = mapped_column(Float, default=0.0)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'created_at': self.created_at.isoformat(),
            'call_type': self.call_type,
            'ticker': self.ticker,
            'prompt_tokens': self.prompt_tokens,
            'completion_tokens': self.completion_tokens,
            'estimated_cost': self.estimated_cost,
        }


class DailyBrief(db.Model):
    __tablename__ = 'daily_briefs'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    brief_date: Mapped[date] = mapped_column(Date, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    market_summary: Mapped[str] = mapped_column(Text, nullable=True)
    articles: Mapped[str] = mapped_column(Text, nullable=True)  # JSON array

    def to_dict(self) -> dict:
        import json
        return {
            'id': self.id,
            'brief_date': self.brief_date.isoformat(),
            'created_at': self.created_at.isoformat(),
            'market_summary': self.market_summary,
            'articles': json.loads(self.articles) if self.articles else [],
        }


class Goal(db.Model):
    __tablename__ = 'goals'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    position_id: Mapped[int] = mapped_column(ForeignKey('positions.id'), index=True)
    goal_type: Mapped[str] = mapped_column(String(32))
    target_value: Mapped[float] = mapped_column(Float, nullable=True)
    target_date: Mapped[datetime] = mapped_column(Date, nullable=True)
    note: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default='OPEN')

    position: Mapped[Position] = relationship('Position', back_populates='goals')
