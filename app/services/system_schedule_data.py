"""시스템 일정 — 네 서비스(pr·fd·st·iv)의 주기적 배치 작업 정의 (캘린더 뷰 「시스템일정」 탭).

코드 정의에서 옮겨 적은 정적 목록이다. 주기가 바뀌면 여기도 함께 고친다(출처 열에 원본 파일 표기).
schedule 형식
  {"type": "interval", "every_sec": N}                      N초마다 (서비스 기동 시각 기준, 정각 정렬 아님)
  {"type": "daily", "times": ["HH:MM", ...], "tz": "Asia/Seoul"}  매일 지정 시각
  {"type": "hourly", "minute": M}                           매시 M분
"""
from __future__ import annotations

SYSTEM_JOBS: list[dict] = [
    # ── lumina-invest (fd.edumgt.co.kr) — celery-beat ──────────────────────────────────
    {"id": "fd-auto-trade", "system": "lumina-invest", "host": "fd.edumgt.co.kr", "component": "celery-beat", "category": "trading",
     "name": "자동매매 사이클 (quant.auto_trade_cycle)", "schedule": {"type": "interval", "every_sec": 180},
     "window": "실주문은 평일 09:00~15:30 KST(장중)만, 가상 체결은 항상",
     "description": "KIS 모의투자 배치·사용자 계정의 매수·매도 판단과 가상 체결, KIS Testbed 실주문 전송. 공격 모드(5분봉) 적용.",
     "source": "lumina-invest/app/celery_app.py · QUANT_CYCLE_SEC"},
    {"id": "fd-confirm-fills", "system": "lumina-invest", "host": "fd.edumgt.co.kr", "component": "celery-beat", "category": "trading",
     "name": "KIS 실주문 체결 확인 (quant.confirm_fills)", "schedule": {"type": "interval", "every_sec": 120},
     "description": "게이트웨이로 보낸 실주문의 체결·취소 상태를 조회해 live_orders 를 갱신. UNKNOWN 주문은 멱등 재전송.",
     "source": "lumina-invest/app/celery_app.py"},
    {"id": "fd-reconcile", "system": "lumina-invest", "host": "fd.edumgt.co.kr", "component": "celery-beat", "category": "ops",
     "name": "로그·실거래 정합성 점검 (quant.reconcile)", "schedule": {"type": "interval", "every_sec": 600},
     "description": "가상 장부·실주문·사이클 로그를 KIS 잔고와 대조해 불일치(phantom, 수량 차이, 미해결 주문)를 알림.",
     "source": "lumina-invest/app/services/reconciliation.py · RECONCILE_INTERVAL_SEC"},
    {"id": "fd-heartbeat", "system": "lumina-invest", "host": "fd.edumgt.co.kr", "component": "celery-beat", "category": "infra",
     "name": "beat 생존 신호 (beat.heartbeat)", "schedule": {"type": "interval", "every_sec": 60},
     "description": "Redis 에 시각을 기록. 180초 넘게 끊기면 healthcheck 실패 → autoheal 이 celery 컨테이너를 재시작.",
     "source": "lumina-invest/app/tasks/beat_health.py"},
    {"id": "fd-autoheal", "system": "lumina-invest", "host": "fd.edumgt.co.kr", "component": "autoheal 컨테이너", "category": "infra",
     "name": "unhealthy 컨테이너 자동 재시작", "schedule": {"type": "interval", "every_sec": 30},
     "description": "autoheal 라벨이 붙은 컨테이너(celery-beat·worker)가 unhealthy 면 재시작. 기동 후 300초 유예.",
     "source": "lumina-invest/compose.fd.yml"},
    {"id": "fd-sync-market", "system": "lumina-invest", "host": "fd.edumgt.co.kr", "component": "celery-beat", "category": "data",
     "name": "시장 지수·환율 동기화 (sync.market_data)", "schedule": {"type": "interval", "every_sec": 3600},
     "description": "KOSPI·KOSDAQ·환율 등 대시보드 지표를 캐시에 갱신.", "source": "lumina-invest/app/tasks/sync_tasks.py"},
    {"id": "fd-sync-candles", "system": "lumina-invest", "host": "fd.edumgt.co.kr", "component": "celery-beat", "category": "data",
     "name": "종목 캔들 캐시 동기화 (sync.stock_candles)", "schedule": {"type": "interval", "every_sec": 86400},
     "description": "유니버스 종목의 일봉 캐시를 하루 1회 갱신.", "source": "lumina-invest/app/tasks/sync_tasks.py"},
    {"id": "fd-rebalance", "system": "lumina-invest", "host": "fd.edumgt.co.kr", "component": "celery-beat", "category": "trading",
     "name": "리밸런싱 트리거 점검 (rebalance.check_triggers)", "schedule": {"type": "interval", "every_sec": 3600},
     "description": "시간·이탈률 기준 리밸런싱 조건을 점검해 제안·알림.", "source": "lumina-invest/app/celery_app.py"},
    {"id": "fd-sagemaker", "system": "lumina-invest", "host": "AWS SageMaker", "component": "Training Job", "category": "data",
     "name": "LightGBM 종목 점수 학습 (scores.json)", "schedule": {"type": "daily", "times": [], "tz": "Asia/Seoul"},
     "description": "일 1회 학습 결과 scores.json 을 S3 에 올리고 자동매매가 ML 가중 전략에서 읽는다(시각은 SageMaker 스케줄 설정).",
     "source": "lumina-invest/app/services/quant_ai_scores.py"},
    # ── stock-coin-trade (st.edumgt.co.kr) — APScheduler(python-backend) · 호스트 cron ──────
    {"id": "st-ohlcv-sync", "system": "stock-coin-trade", "host": "st.edumgt.co.kr", "component": "APScheduler", "category": "data",
     "name": "OHLCV 증분 동기화 (ohlcv-incremental-batch → pg-stock)", "schedule": {"type": "daily", "times": ["06:20", "18:20"], "tz": "Asia/Seoul"},
     "description": "KRX 2,700여 종목 일봉을 pg-stock(ohlcv 테이블)에 증분 적재하고 요약 집계. 기준 18시 + 12시간 간격.",
     "source": "stock-coin-trade/python-stock-backend/app/jobs/scheduler.py · OHLCV_SYNC_HOUR/INTERVAL/MINUTE"},
    {"id": "st-bot-round", "system": "stock-coin-trade", "host": "st.edumgt.co.kr", "component": "APScheduler", "category": "trading",
     "name": "시장 봇 모의 거래 라운드 (run_bot_trading_round)", "schedule": {"type": "interval", "every_sec": 600},
     "description": "내장 봇 계정들이 자체 모의투자 장부에서 매매해 시장 활동을 만든다.", "source": "stock-coin-trade/python-stock-backend/app/jobs/scheduler.py"},
    {"id": "st-cmc", "system": "stock-coin-trade", "host": "st.edumgt.co.kr", "component": "APScheduler", "category": "data",
     "name": "CoinMarketCap 순위 동기화", "schedule": {"type": "hourly", "minute": 0},
     "description": "암호화폐 시총 순위를 매시 정각에 갱신.", "source": "stock-coin-trade/python-stock-backend/app/jobs/scheduler.py"},
    {"id": "st-upbit", "system": "stock-coin-trade", "host": "st.edumgt.co.kr", "component": "APScheduler", "category": "data",
     "name": "업비트 마켓 목록 동기화", "schedule": {"type": "daily", "times": ["18:00"], "tz": "Asia/Seoul"},
     "description": "업비트 거래 가능 마켓 코드·이름을 하루 1회 갱신.", "source": "stock-coin-trade/python-stock-backend/app/jobs/scheduler.py"},
    {"id": "st-krx-list", "system": "stock-coin-trade", "host": "st.edumgt.co.kr", "component": "python-backend 캐시", "category": "data",
     "name": "KRX 상장법인 목록 캐시 갱신", "schedule": {"type": "interval", "every_sec": 86400},
     "description": "종목 검색용 KIND 상장법인 목록을 24시간 캐시. 실패 시 내장 14종목으로 대체(요청 시점에 갱신).",
     "source": "stock-coin-trade/python-stock-backend/app/services/stock_market.py · KRX_LIST_TTL"},
    {"id": "st-certbot", "system": "stock-coin-trade", "host": "st.edumgt.co.kr", "component": "호스트 cron", "category": "infra",
     "name": "Let's Encrypt 인증서 갱신 (certbot renew)", "schedule": {"type": "daily", "times": ["03:15"], "tz": "Asia/Seoul"},
     "description": "st·iv 공용 인증서를 webroot 방식으로 무중단 갱신 후 nginx reload.", "source": "stock-coin-trade/scripts/ec2/init-letsencrypt.sh"},
    # ── domain-rag-lab (pr) · stock-kms-portal (iv) — 주기 배치 없음(온디맨드·푸시 배포) ─────
    {"id": "pr-deploy", "system": "domain-rag-lab", "host": "pr.edumgt.co.kr", "component": "GitHub Actions", "category": "infra",
     "name": "main 푸시 배포 (cd.yml)", "schedule": {"type": "event", "trigger": "git push main"},
     "description": "주기 배치는 없고 푸시 시 rsync·compose 재빌드. LEAN 백테스트·yfinance 수집은 사용자 요청 시 실행.", "source": "domain-rag-lab/.github/workflows/cd.yml"},
    {"id": "iv-deploy", "system": "stock-kms-portal", "host": "iv.edumgt.co.kr", "component": "수동 반영", "category": "infra",
     "name": "포털 반영 (scp + compose up api)", "schedule": {"type": "event", "trigger": "수동"},
     "description": "주기 배치 없음. 과거 시세 백필(backfill_ohlcv)은 수동 실행.", "source": "stock-kms-portal/todo.md 8절"},
]
