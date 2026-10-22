"""종목 보기 재무건전성(알트먼 Z-Score) 수동 수집.

평소에는 API 프로세스의 백그라운드 수집기(app/services/financial_health_collector.py)가 30분마다 한 종목씩 돈다.
이 스크립트는 특정 종목을 바로 보고 싶거나, 최초 적재를 앞당기고 싶을 때 컨테이너 안에서 실행한다.

    docker compose exec api python -m app.ops.collect_financial_health --ticker 005930      # 한 종목
    docker compose exec api python -m app.ops.collect_financial_health --next 5             # 미수집·오래된 순으로 5종목
    docker compose exec api python -m app.ops.collect_financial_health --all --sleep 2      # 전체(DART 호출 사이 2초)
"""
from __future__ import annotations

import argparse
import asyncio
import json

from app.services import dart_client
from app.services.financial_health_collector import collect_next, collect_one, parse_companies


def _print(record: dict) -> None:
    keep = {k: record.get(k) for k in ("ticker", "name", "sector", "model", "zone", "z", "report_name", "fiscal_year", "fs_div", "reason")}
    print(json.dumps(keep, ensure_ascii=False, default=str))


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ticker", help="6자리 종목코드")
    parser.add_argument("--next", type=int, default=0, help="미수집·오래된 순으로 N종목")
    parser.add_argument("--all", action="store_true", help="아틀라스 전체")
    parser.add_argument("--sleep", type=float, default=1.0, help="종목 사이 대기 초")
    args = parser.parse_args()
    if not dart_client.is_enabled():
        raise SystemExit("DART_API_KEY 가 설정되지 않았습니다.")
    companies = parse_companies()
    if args.ticker:
        match = [c for c in companies if c["ticker"] == args.ticker]
        if not match:
            raise SystemExit(f"{args.ticker} 는 종목 보기 목록에 없습니다.")
        _print(await collect_one(match[0]))
    elif args.all:
        for company in companies:
            _print(await collect_one(company))
            await asyncio.sleep(args.sleep)
    else:
        for _ in range(max(1, args.next)):
            record = await collect_next()
            if not record:
                break
            _print(record)
            await asyncio.sleep(args.sleep)


if __name__ == "__main__":
    asyncio.run(main())
