from sqlalchemy import BigInteger, Boolean, Column, Date, DateTime, Float, Integer, String, Text, UniqueConstraint, func

from app.core.database import Base


class StockFinancialHealth(Base):
    """종목 보기 재무건전성(알트먼 Z-Score) — 종목당 한 행, 수집기가 한 시간에 한 종목씩 갱신한다.

    원시 계정(원 단위)·비율·판정을 함께 저장해 화면이 DART 를 다시 두드리지 않게 한다. 계산 불가면 z 는 NULL 이고 reason 에 사유.
    """

    __tablename__ = "stock_financial_health"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), nullable=False, index=True)
    market = Column(String(20), nullable=False)
    name = Column(String(80))
    sector = Column(String(60))
    model = Column(String(12), nullable=False)           # Z · Z'' · EXCLUDED
    zone = Column(String(12))                             # safe · grey · distress · excluded · NULL(계산 불가)
    z = Column(Float)

    fiscal_year = Column(Integer)
    quarter = Column(Integer)
    report_name = Column(String(20))
    fs_div = Column(String(8))                            # 연결 · 별도
    assets = Column(BigInteger)
    liabilities = Column(BigInteger)
    equity = Column(BigInteger)
    current_assets = Column(BigInteger)
    current_liabilities = Column(BigInteger)
    retained_earnings = Column(BigInteger)
    retained_earnings_basis = Column(String(20))
    operating_income_ttm = Column(BigInteger)
    operating_income_basis = Column(String(60))
    revenue_ttm = Column(BigInteger)
    revenue_basis = Column(String(60))
    shares_total = Column(BigInteger)
    close_used = Column(Float)
    close_date = Column(Date)
    market_cap = Column(BigInteger)

    x1 = Column(Float)
    x2 = Column(Float)
    x3 = Column(Float)
    x4 = Column(Float)
    x5 = Column(Float)

    ok = Column(Boolean, nullable=False, default=False)
    reason = Column(Text)
    source = Column(String(120))
    computed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("ticker", "market", name="uq_stock_financial_health_ticker_market"),
    )

    def to_summary(self) -> dict:
        return {"ticker": self.ticker, "market": self.market, "model": self.model, "zone": self.zone, "z": self.z,
                "report": f"{self.fiscal_year} {self.report_name}" if self.fiscal_year and self.report_name else None,
                "computed_at": self.computed_at.isoformat() if self.computed_at else None}

    def to_detail(self) -> dict:
        return {
            **self.to_summary(),
            "name": self.name, "sector": self.sector, "ok": self.ok, "reason": self.reason, "source": self.source,
            "fs_div": self.fs_div, "fiscal_year": self.fiscal_year, "quarter": self.quarter,
            "inputs": {
                "assets": self.assets, "liabilities": self.liabilities, "equity": self.equity,
                "current_assets": self.current_assets, "current_liabilities": self.current_liabilities,
                "retained_earnings": self.retained_earnings, "retained_earnings_basis": self.retained_earnings_basis,
                "operating_income_ttm": self.operating_income_ttm, "operating_income_basis": self.operating_income_basis,
                "revenue_ttm": self.revenue_ttm, "revenue_basis": self.revenue_basis,
                "shares_total": self.shares_total, "close_used": self.close_used,
                "close_date": self.close_date.isoformat() if self.close_date else None, "market_cap": self.market_cap,
            },
            "components": {k: getattr(self, k) for k in ("x1", "x2", "x3", "x4", "x5") if getattr(self, k) is not None},
        }
