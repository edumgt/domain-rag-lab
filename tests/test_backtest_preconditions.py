from datetime import date
import unittest
import pandas as pd
from app.schemas.chat import BacktestRequest
from app.services.backtest_preconditions import check_preconditions
from app.services.lean_backtest_service import LeanBacktestService
class Store:
    def __init__(self,close): self.close=close
    def close_series(self,*args): return self.close,{'source':'fixture'}
class PreconditionsTests(unittest.TestCase):
    def request(self,**kw):
        return BacktestRequest(**dict(ticker='SPY',start_date=date(2025,6,1),end_date=date(2025,8,1),compare_start_date=date(2025,6,1),compare_end_date=date(2025,8,1),strategy='ma_cross',**kw))
    def test_full_data_passes_and_reports_observations(self):
        s=pd.Series(range(100,280),index=pd.bdate_range('2025-01-01',periods=180),dtype=float)
        r=check_preconditions(self.request(),LeanBacktestService(Store(s)))
        self.assertTrue(r['can_run']);self.assertEqual(next(c for c in r['checks'] if c['key']=='지표 준비 구간')['status'],'pass')
        self.assertIsNotNone(r['diagnostics']);self.assertEqual(r['data']['currency'],'USD')
    def test_empty_and_invalid_prices_block(self):
        for s in [pd.Series(dtype=float),pd.Series([100,float('inf')],index=pd.bdate_range('2025-06-02',periods=2))]:
            self.assertFalse(check_preconditions(self.request(),LeanBacktestService(Store(s)))['can_run'])
    def test_missing_warmup_warns_instead_of_claiming_suitability(self):
        s=pd.Series(range(100,130),index=pd.bdate_range('2025-06-02',periods=30),dtype=float)
        r=check_preconditions(self.request(),LeanBacktestService(Store(s)))
        self.assertEqual(next(c for c in r['checks'] if c['key']=='지표 준비 구간')['status'],'warn')
    def test_bad_dates_stop_before_data_access(self):
        p=self.request();p.end_date=p.start_date
        self.assertFalse(check_preconditions(p,LeanBacktestService(Store(None)))['can_run'])
