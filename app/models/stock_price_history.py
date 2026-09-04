from sqlalchemy import BigInteger, Column, Date, DateTime, Integer, Numeric, String, UniqueConstraint, func

from app.core.database import Base


class StockPriceHistory(Base):
    """일별 OHLCV 과거 시세 캐시. 종목 매거진의 '과거 데이터 보기' 차트에 사용."""

    __tablename__ = "stock_price_history"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), nullable=False, index=True)
    market = Column(String(20), nullable=False)
    date = Column(Date, nullable=False)
    open = Column(Numeric(16, 2))
    high = Column(Numeric(16, 2))
    low = Column(Numeric(16, 2))
    close = Column(Numeric(16, 2))
    volume = Column(BigInteger)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("ticker", "market", "date", name="uq_stock_price_history_ticker_market_date"),
    )
