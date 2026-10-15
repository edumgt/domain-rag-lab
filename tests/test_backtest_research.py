from datetime import date
import unittest
import numpy as np
import pandas as pd
from app.api.routes.backtest import ResearchRequest
from app.services.backtest_research import simulate,research
from app.services.lean_backtest_service import LeanBacktestService,LeanBacktestError
class Store:
    def __init__(self,s):self.s=s
    def close_series(self,*args):return self.s,{'source':'fixture'}
class ResearchTests(unittest.TestCase):
    def request(self,**kw):
        values=dict(ticker='SPY',start_date=date(2025,1,1),end_date=date(2025,10,1),compare_start_date=date(2025,1,1),compare_end_date=date(2025,10,1),fee_bps=0,slippage_bps=0,stop_loss_pct=0)
        values.update(kw);return ResearchRequest(**values)
    def test_costs_reduce_same_signal_returns(self):
        s=pd.Series(np.linspace(100,200,100),index=pd.bdate_range('2025-01-01',periods=100))
        p=self.request();a=simulate(s,p);b=simulate(s,p.model_copy(update={'fee_bps':10,'slippage_bps':20}))
        self.assertGreater(a['metrics']['return_pct'],b['metrics']['return_pct']);self.assertGreater(b['cost_initial_pct'],0)
    def test_stop_uses_prior_close_and_can_gap_past_threshold(self):
        s=pd.Series([100,100,80,60,120],index=pd.bdate_range('2025-01-01',periods=5))
        r=simulate(s,self.request(stop_loss_pct=10))
        self.assertEqual(r['stop_events'],1);self.assertAlmostEqual(r['curve'].iloc[-1],.6)
    def test_future_edits_cannot_change_prefix(self):
        s=pd.Series(100+np.sin(np.arange(100)/3)*10+np.arange(100)/10,index=pd.bdate_range('2025-01-01',periods=100))
        for strategy in ['buy_hold','ma_cross','momentum','dca']:
            p=self.request(strategy=strategy,short_window=3,long_window=8,breakout_window=5,trend_filter=True,trend_window=5)
            a=simulate(s,p)['curve'];changed=s.copy();changed.iloc[70:]*=4;b=simulate(changed,p)['curve']
            pd.testing.assert_series_equal(a.iloc[:70],b.iloc[:70])
    def test_fractional_entry_target(self):
        s=pd.Series([100,100,110,120],index=pd.bdate_range('2025-01-01',periods=4))
        r=simulate(s,self.request(position_pct=50))
        self.assertAlmostEqual(r['curve'].iloc[-1],1.1)
    def test_research_segments_and_audit_are_explicit(self):
        s=pd.Series(100+np.arange(300)*.2+np.sin(np.arange(300)),index=pd.bdate_range('2024-10-01',periods=300))
        r=research(self.request(strategy='ma_cross',short_window=5,long_window=20),LeanBacktestService(Store(s)))
        self.assertEqual(len(r['folds']),3);self.assertEqual(len(r['sensitivity']),3)
        self.assertLess(r['folds'][0]['end'],r['folds'][1]['start'])
        self.assertIn('LEAN 공식 통계 아님',r['engine'])
        self.assertEqual(next(x for x in r['audit'] if x['key']=='생존·선택 편향')['status'],'warn')
    def test_scope_and_invalid_numeric_values_rejected(self):
        for kw in [dict(fee_bps=float('nan')),dict(slippage_bps=-1),dict(position_pct=101)]:
            with self.assertRaises(ValueError):self.request(**kw)
        with self.assertRaises(ValueError):research(self.request(market_scope='global'))
        with self.assertRaises(ValueError):research(self.request(ticker='005930.KS',market_scope='us'))
    def test_engine_startup_is_not_completion(self):
        for log,code in [('Algorithm Id Engine.Run',1),('Runtime Error: broken',0)]:
            with self.assertRaises(LeanBacktestError):LeanBacktestService._validate_engine_run(log,code)
