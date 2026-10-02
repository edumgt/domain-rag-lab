#!/usr/bin/env python3
"""한국 공휴일에 EC2(fd.edumgt.co.kr / pr.edumgt.co.kr 서버 등)를 중지하는 EventBridge Scheduler 일정을 만든다.

배경: `ec2-office-hours-start-0840`(매일 08:40 KST 기동)과 `ec2-office-hours-stop-1740`(매일 17:40 KST 중지)이
요일·공휴일 구분 없이 돈다. cron 식으로는 특정 날짜를 제외할 수 없으므로, 공휴일마다 08:50 KST에
`ec2:StopInstances`를 호출하는 일회성 일정(`at(...)`)을 `kr-holidays` 그룹에 둔다. 실행이 끝난 일정은 자동 삭제된다
(ActionAfterCompletion=DELETE).

사용법:
    python3 deploy/pr-edumgt/kr_holiday_stop_schedules.py            # 아래 HOLIDAYS 중 미래 날짜를 생성/갱신
    python3 deploy/pr-edumgt/kr_holiday_stop_schedules.py --list     # 현재 등록된 공휴일 일정 확인
    python3 deploy/pr-edumgt/kr_holiday_stop_schedules.py --delete   # kr-holidays 그룹의 일정 전체 삭제

유지보수: 정부가 임시공휴일·선거일을 지정하면 HOLIDAYS에 날짜를 추가하고 다시 실행한다. 이미 있는 일정은 덮어쓴다.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import subprocess
import sys

REGION = "ap-northeast-2"
GROUP = "kr-holidays"
ROLE_ARN = "arn:aws:iam::086015456585:role/lumina-ec2-office-hours-scheduler-role"
INSTANCE_IDS = ["i-0436b32f1d5c9ae5b", "i-06f9ae097f2e86af4"]  # fd.edumgt.co.kr(pr 포함), ubuntu-26-stock-coin-trade
STOP_TIME = "08:50:00"  # 08:40 기동 직후 중지
TZ = "Asia/Seoul"

# (날짜, 이름). 주말에 걸린 날도 넣어 둔다(기동 일정이 주말에도 돌기 때문).
HOLIDAYS: list[tuple[str, str]] = [
    ("2026-10-03", "개천절"),
    ("2026-10-05", "개천절 대체공휴일"),
    ("2026-10-09", "한글날"),
    ("2026-12-25", "성탄절"),
    ("2027-01-01", "신정"),
    ("2027-02-06", "설날 연휴"),
    ("2027-02-07", "설날"),
    ("2027-02-08", "설날 연휴"),
    ("2027-02-09", "설날 대체공휴일"),
    ("2027-03-01", "삼일절"),
    ("2027-05-05", "어린이날"),
    ("2027-05-13", "부처님오신날"),
    ("2027-06-06", "현충일"),
    ("2027-08-15", "광복절"),
    ("2027-08-16", "광복절 대체공휴일"),
    ("2027-09-14", "추석 연휴"),
    ("2027-09-15", "추석"),
    ("2027-09-16", "추석 연휴"),
    ("2027-10-03", "개천절"),
    ("2027-10-04", "개천절 대체공휴일"),
    ("2027-10-09", "한글날"),
    ("2027-10-11", "한글날 대체공휴일"),
    ("2027-12-25", "성탄절"),
    ("2027-12-27", "성탄절 대체공휴일"),
]


def aws(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    cmd = ["aws", "scheduler", *args, "--region", REGION, "--output", "json"]
    return subprocess.run(cmd, text=True, capture_output=True, check=check)


def ensure_group() -> None:
    groups = json.loads(aws("list-schedule-groups").stdout)["ScheduleGroups"]
    if not any(g["Name"] == GROUP for g in groups):
        aws("create-schedule-group", "--name", GROUP)
        print(f"created schedule group {GROUP}")


def upsert(date: str, name: str) -> None:
    schedule_name = f"kr-holiday-stop-{date}"
    common = [
        "--name", schedule_name,
        "--group-name", GROUP,
        "--schedule-expression", f"at({date}T{STOP_TIME})",
        "--schedule-expression-timezone", TZ,
        "--flexible-time-window", json.dumps({"Mode": "OFF"}),
        "--action-after-completion", "DELETE",
        "--description", f"{name}: EC2 2대 {STOP_TIME[:5]} KST 중지(08:40 기동 취소)",
        "--target", json.dumps({
            "Arn": "arn:aws:scheduler:::aws-sdk:ec2:stopInstances",
            "RoleArn": ROLE_ARN,
            "Input": json.dumps({"InstanceIds": INSTANCE_IDS}),
        }),
    ]
    exists = aws("get-schedule", "--name", schedule_name, "--group-name", GROUP, check=False).returncode == 0
    aws("update-schedule" if exists else "create-schedule", *common)
    print(("updated " if exists else "created ") + f"{schedule_name} ({name})")


def list_schedules() -> list[dict]:
    out = aws("list-schedules", "--group-name", GROUP, check=False)
    if out.returncode:
        return []
    return json.loads(out.stdout)["Schedules"]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--delete", action="store_true")
    args = parser.parse_args()

    if args.list:
        for s in sorted(list_schedules(), key=lambda s: s["Name"]):
            print(s["Name"], s["State"])
        return 0
    if args.delete:
        for s in list_schedules():
            aws("delete-schedule", "--name", s["Name"], "--group-name", GROUP)
            print("deleted", s["Name"])
        return 0

    ensure_group()
    today = dt.date.today().isoformat()
    for date, name in HOLIDAYS:
        if date < today:
            continue
        upsert(date, name)
    return 0


if __name__ == "__main__":
    sys.exit(main())
