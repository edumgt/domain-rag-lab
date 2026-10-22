"""Shared Project 3 draw and public presentation feedback."""
import secrets
import unicodedata
from typing import Annotated
from datetime import datetime, timezone

from fastapi.responses import Response
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import Column, DateTime, Integer, JSON, String, Text, Index, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.project3_database import Project3Base as Base, get_project3_db as get_db

router = APIRouter(prefix="/presentation3", tags=["presentation"])
PRESENTERS = ["팀1", "팀2", "김정", "CKS", "OTH", "LSH", "KIJ", "LSH"]


class Project3PresentationDraw(Base):
    __tablename__ = "project3_presentation_draw"
    id = Column(Integer, primary_key=True)
    assignments = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)


class Project3PresentationDrawUsage(Base):
    __tablename__ = "project3_presentation_draw_usage"
    id = Column(Integer, primary_key=True)
    clicks = Column(Integer, nullable=False, default=0)


def draw_json(draw, db):
    usage = db.get(Project3PresentationDrawUsage, draw.id)
    clicks = usage.clicks if usage else 0
    return {"assignments": draw.assignments, "created_at": draw.created_at.isoformat(),
            "clicks": clicks, "remaining": max(0, 3 - clicks), "locked": clicks >= 3}


class Project3PresentationOpinion(Base):
    __tablename__ = "project3_presentation_opinions"
    id = Column(Integer, primary_key=True)
    presenter_id = Column(Integer, nullable=False)
    author = Column(String(40), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)


class OpinionInput(BaseModel):
    presenter_id: int = Field(ge=1, le=8)
    author: str = Field(min_length=1, max_length=40)
    content: str = Field(min_length=1, max_length=2000)

    @field_validator("author", "content")
    @classmethod
    def strip_text(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("내용을 입력해주세요.")
        return value


def opinion_json(row):
    return {"id": row.id, "presenter_id": row.presenter_id, "author": row.author,
            "content": row.content, "created_at": row.created_at.isoformat()}


@router.get("/order")
def order(db: Session = Depends(get_db)):
    draw = db.get(Project3PresentationDraw, 1)
    if draw is None:
        numbers = list(range(1, len(PRESENTERS) + 1))
        secrets.SystemRandom().shuffle(numbers)
        assignments = [{"id": i + 1, "name": name, "order": numbers[i],
                        "label": ("LSH(이상하)" if i == 5 else "LSH(이세현)") if name == "LSH" else name}
                       for i, name in enumerate(PRESENTERS)]
        draw = Project3PresentationDraw(id=1, assignments=assignments, created_at=datetime.now(timezone.utc))
        db.add(draw)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
        draw = db.get(Project3PresentationDraw, 1)
    return draw_json(draw, db)


@router.post("/order/randomize")
def randomize_order(db: Session = Depends(get_db)):
    order(db)  # Initialize the shared draw if this is the first visit.
    draw = db.query(Project3PresentationDraw).filter_by(id=1).populate_existing().with_for_update().one()
    usage = db.get(Project3PresentationDrawUsage, draw.id)
    if usage is not None and usage.clicks >= 3:
        raise HTTPException(status_code=409, detail="3회 추첨이 완료되어 발표 순서가 최종 확정되었습니다.")
    if usage is None:
        usage = Project3PresentationDrawUsage(id=draw.id, clicks=0)
        db.add(usage)
    usage.clicks += 1
    previous = {person["id"]: person["order"] for person in draw.assignments}
    people = [dict(person) for person in draw.assignments]
    numbers = list(range(1, len(people) + 1))
    while True:
        secrets.SystemRandom().shuffle(numbers)
        if any(previous[person["id"]] != number for person, number in zip(people, numbers)):
            break
    draw.assignments = sorted([dict(person, order=number) for person, number in zip(people, numbers)], key=lambda person: person["order"])
    draw.created_at = datetime.now(timezone.utc)
    db.commit()
    return draw_json(draw, db)


@router.get("/opinions")
def opinions(db: Session = Depends(get_db)):
    rows = db.query(Project3PresentationOpinion).order_by(Project3PresentationOpinion.id.desc()).limit(200).all()
    return {"opinions": [opinion_json(row) for row in rows]}


@router.post("/opinions", status_code=201)
def post_opinion(payload: OpinionInput, db: Session = Depends(get_db)):
    # Bound accidental duplicate submissions without storing IP addresses.
    previous = db.query(Project3PresentationOpinion).filter_by(
        presenter_id=payload.presenter_id, author=payload.author,
        content=payload.content).order_by(Project3PresentationOpinion.id.desc()).first()
    if previous:
        when = previous.created_at.replace(tzinfo=timezone.utc) if previous.created_at.tzinfo is None else previous.created_at
        if (datetime.now(timezone.utc) - when).total_seconds() < 60:
            raise HTTPException(status_code=409, detail="같은 의견이 방금 등록되었습니다.")
    row = Project3PresentationOpinion(**payload.model_dump(), created_at=datetime.now(timezone.utc))
    db.add(row)
    db.commit()
    db.refresh(row)
    return opinion_json(row)


SURVEY_VERSION = 3
SURVEY_QUESTIONS = [
    {"id": 1, "category": "산출물 완성도 · 종합", "text": "계획한 산출물이 빠짐없이 완성되어 실제 시연·제출이 가능한가요?"},
    {"id": 2, "category": "기능 적합성", "text": "핵심 기능이 요구사항과 사용 목적에 맞게 정확한 결과를 제공하나요?"},
    {"id": 3, "category": "성능 효율성", "text": "대표 작업의 응답 속도와 자원 사용이 사용 목적에 적절한가요?"},
    {"id": 4, "category": "호환성", "text": "외부 API·데이터·다른 시스템과의 연동이 명시한 환경에서 정상 동작하나요?"},
    {"id": 5, "category": "상호작용 역량", "text": "사용자가 화면과 안내를 이해하고 주요 작업을 쉽게 완료할 수 있나요?"},
    {"id": 6, "category": "신뢰성", "text": "반복 실행과 오류 상황에서도 결과가 일관되며 실패 후 복구할 수 있나요?"},
    {"id": 7, "category": "보안성", "text": "인증·권한·입력 검증으로 개인정보와 중요 데이터를 적절히 보호하나요?"},
    {"id": 8, "category": "유지보수성", "text": "코드 구조·실행 문서·테스트 근거가 있어 다른 사람이 수정하고 검증할 수 있나요?"},
    {"id": 9, "category": "창의성", "text": "문제 해결 방식이나 핵심 기능에 독창적인 아이디어와 기존 사례 대비 차별성이 있나요?"},
    {"id": 10, "category": "실 제품화", "text": "실제 사용자에게 제공할 수 있도록 배포·운영·사용 안내가 준비되어 있고, 제품이나 서비스로 활용할 가능성이 있나요?"},
]
SURVEY_RUBRICS = [{'guidance': '처음 약속한 기능·화면·문서가 얼마나 빠짐없이 준비됐는지 봅니다. 결과의 정확성은 2번에서 따로 평가합니다.',
  'example': '요구사항에 있는 등록·조회·수정·삭제 기능을 직접 실행하고, 실행 파일·소스코드·사용 설명서가 모두 제출됐는지 확인합니다.',
  'ratings': ['계획한 주요 산출물이 모두 완성되어 전체 흐름을 직접 시연할 수 있음',
              '핵심 산출물은 완성됐고 문구·화면 등 작은 보완만 필요함',
              '핵심 흐름은 시연되지만 일부 기능이나 문서가 빠져 있음',
              '핵심 흐름 일부가 미완성이어서 시연에 큰 도움이 필요함',
              '기획 설명이나 화면 초안만 있고 실행 가능한 핵심 산출물이 없음']},
 {'guidance': '요구사항에 정의된 입력·처리·출력이 정확하게 구현됐는지 봅니다. 정해진 테스트의 예상 결과와 실제 결과를 비교합니다.',
  'example': '검색어를 입력하면 일치하는 항목만 나오는지, 필수값을 비워 저장하면 안내하고 저장을 막는지, 수정한 내용이 다시 조회되는지 확인합니다.',
  'ratings': ['정상 입력과 예외 입력을 검증했고 요구사항에 맞는 정확한 결과를 보여줌',
              '주요 요구사항을 충족하고 결과가 정확하나 드문 예외는 보완이 필요함',
              '대표 사례는 맞지만 확인한 사례가 적거나 일부 요구사항이 빠짐',
              '일반적인 입력에서도 요구사항과 다른 처리·출력 오류가 여러 번 나타남',
              '핵심 기능의 입력·처리·출력이 요구사항과 맞지 않음']},
 {'guidance': '사용자가 기다리는 시간과 실행에 필요한 자원이 작업 목적에 적절한지 봅니다. 무조건 빠른 팀보다 설명한 목표를 충족하는지 확인합니다.',
  'example': '테스트 데이터 1,000건과 동시 사용자 10명 등 합의한 조건에서 응답 시간을 반복 측정하고, 목표 시간과 CPU·메모리 사용량을 비교합니다.',
  'ratings': ['목표 속도를 반복 측정으로 충족하고 대표 부하·자원 사용 근거도 제시함',
              '일반 작업이 원활하고 측정 근거가 있으나 부하 검증은 제한적임',
              '시연은 가능하지만 대기 시간이 있거나 측정 근거가 부족함',
              '일반 작업이 자주 느려 사용 흐름이 끊김',
              '대부분의 작업이 시간 초과·멈춤으로 완료되지 않음']},
 {'guidance': '지원한다고 밝힌 환경에서 외부 데이터와 다른 시스템이 제대로 연결되는지 봅니다.',
  'example': '외부 API가 보내는 JSON 필드·날짜 형식을 올바르게 처리하는지, 지원한다고 밝힌 브라우저에서 같은 기능이 동작하는지 확인합니다.',
  'ratings': ['명시한 연동·지원 환경이 모두 동작하고 실패 시 처리까지 확인함',
              '주요 연동·환경은 정상이며 드문 형식·환경 차이만 보완이 필요함',
              '대표 환경 하나에서는 연결되나 다른 지원 환경이나 데이터 형식 검증이 부족함',
              '지원한다고 한 환경이나 주요 API에서 연동 오류가 자주 발생함',
              '핵심 외부 데이터·시스템과 연결되지 않아 서비스를 수행할 수 없음']},
 {'guidance': '처음 쓰는 사람이 안내를 이해하고 스스로 작업을 마칠 수 있는지 봅니다.',
  'example': '처음 사용하는 사람이 설명을 듣지 않고 메뉴에서 항목을 찾아 등록을 완료하고, 잘못 입력했을 때 오류 메시지를 보고 고칠 수 있는지 확인합니다.',
  'ratings': ['처음 쓰는 사람도 안내·오류 메시지를 이해하며 주요 작업을 스스로 완료함',
              '대부분 스스로 완료하고 일부 용어·배치만 짧은 설명이 필요함',
              '기본 사용은 가능하지만 여러 단계에서 발표자의 설명이 필요함',
              '메뉴·입력 방법이 혼란스러워 진행 중 자주 막힘',
              '안내를 받아도 핵심 작업을 마치기 어려움']},
 {'guidance': '동일한 입력과 고정된 테스트 환경에서 일관되게 동작하고, 장애 후 데이터를 잃거나 중복 처리하지 않고 복구되는지 봅니다.',
  'example': '같은 테스트를 여러 번 실행하고 네트워크를 끊었다가 다시 연결합니다. 재시도 후 저장 데이터가 사라지거나 같은 항목이 두 번 등록되지 않는지 확인합니다.',
  'ratings': ['반복·장애 복구를 시험했고 결과 누락·중복 없이 일관되게 동작함',
              '일반 반복 실행은 안정적이고 일시적 오류 후 재시도가 가능함',
              '한 번의 시연은 성공하지만 반복·복구 시험 근거가 부족함',
              '반복 실행 중 자주 멈추거나 결과가 누락되어 수동 조치가 필요함',
              '핵심 작업이 대부분 실패하거나 저장된 결과를 신뢰하기 어려움']},
 {'guidance': '사용자 데이터·인증 정보가 보호되고, 사용자별 권한과 입력 검증이 동작하는지 봅니다. 접근 차단 시험과 설정 근거로 확인합니다.',
  'example': '일반 사용자로 관리자 URL을 요청했을 때 접근이 거부되는지, 다른 사용자의 비공개 문서를 볼 수 없는지, 코드·로그에 비밀번호나 API 키가 노출되지 않는지 확인합니다.',
  'ratings': ['권한·입력·비밀정보 보호를 구현하고 금지된 접근이 차단되는 시험 근거를 제시함',
              '기본 인증·권한·비밀정보 보호가 동작하며 일부 추가 시험이 필요함',
              '기본 보호는 있으나 권한·입력 검증 시험이나 일부 설정이 부족함',
              '중요 데이터에 불필요한 접근이 가능하거나 입력 보호에 큰 결함이 있음',
              '비밀번호·키가 공개되거나 다른 사용자의 중요 데이터에 제한 없이 접근 가능함']},
 {'guidance': '다른 사람이 문서와 코드를 보고 실행·수정·검증할 수 있는지 봅니다.',
  'example': '다른 개발자가 README로 설치·실행하고, 입력 검증 규칙 하나를 수정한 뒤 자동 테스트로 기존 기능에 문제가 없는지 확인합니다.',
  'ratings': ['다른 사람이 문서대로 실행하고 모듈별 수정·테스트까지 수행할 수 있음',
              '실행 문서와 코드 구분이 명확하고 주요 테스트가 있어 작은 안내로 수정 가능함',
              '실행·수정은 가능하지만 문서 또는 테스트가 일부 빠져 있음',
              '코드가 얽혀 있고 문서가 부족해 작성자 도움 없이는 수정이 어려움',
              '실행 방법과 구조를 알기 어렵고 변경 결과를 확인할 근거도 없음']},
 {'guidance': '기존 예제를 그대로 복사한 정도가 아니라 누구의 어떤 문제를 새롭게 풀었는지 봅니다. 신기술 사용 자체만으로 높은 점수를 주지 않습니다.',
  'example': '같은 작업을 여러 화면에서 반복하던 기존 방식과, 반복 입력을 줄인 새 흐름을 비교해 조작 단계·입력 오류가 줄어드는지 확인합니다.',
  'ratings': ['사용자 문제에 맞는 독창적인 해결책을 구현하고 차별적 가치의 근거까지 제시함',
              '아이디어의 차별성이 분명하고 핵심 부분이 실제로 구현됨',
              '기존 방식에 유용한 작은 개선이 구현됨',
              '아이디어는 있으나 기존 예제와 차이가 작거나 구현이 부족함',
              '기존 예제를 거의 그대로 사용하며 차별적 문제 해결을 설명하지 못함']},
 {'guidance': '개발자 PC의 시연을 넘어 실제 환경에 설치·배포하고 운영할 준비가 됐는지 봅니다. 판매 실적보다 설치·배포·모니터링·백업·사용 안내 근거를 확인합니다.',
  'example': '새 환경에서 설치 문서대로 배포하고, 오류 로그·상태 점검·백업과 복구 절차·사용 설명서가 준비됐는지 확인합니다.',
  'ratings': ['실제 환경 배포와 사용자 검증을 마쳤고 모니터링·백업·복구·사용 안내가 갖춰짐',
              '핵심 서비스 배포와 사용 안내가 준비됐고 운영 절차의 작은 보완이 필요함',
              '시험 배포는 가능하지만 모니터링·복구 절차나 사용 안내 일부가 부족함',
              '발표자 PC 시연 위주이며 외부 제공 준비에 큰 작업이 남아 있음',
              '실행 가능한 제품 흐름이나 실제 사용자 제공 계획을 확인하기 어려움']}]
for question, rubric in zip(SURVEY_QUESTIONS, SURVEY_RUBRICS):
    question.update({**rubric, "ratings": list(reversed(rubric["ratings"]))})

SURVEY_SCALE = ["매우 미흡", "미흡", "보통", "우수", "매우 우수"]


class Project3PresentationSurvey(Base):
    __tablename__ = "project3_presentation_surveys"
    id = Column(Integer, primary_key=True)
    presenter_id = Column(Integer, nullable=False)
    author = Column(String(40), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    scores = Column(JSON, nullable=False)
    evidence = Column(Text, nullable=False, default="")
    created_at = Column(DateTime(timezone=True), nullable=False)


# Presenter identity stays stable when the presentation order is randomized.
Index("uq_project3_survey_presenter_author", Project3PresentationSurvey.presenter_id,
      func.lower(func.trim(Project3PresentationSurvey.author)), unique=True)


class SurveyInput(BaseModel):
    presenter_id: int = Field(ge=1, le=8, strict=True)
    author: str = Field(min_length=1, max_length=40)
    scores: list[Annotated[int, Field(ge=1, le=5, strict=True)]] = Field(min_length=10, max_length=10)
    evidence: str = Field(default="", max_length=2000)

    @field_validator("author")
    @classmethod
    def strip_author(cls, value):
        value = " ".join(unicodedata.normalize("NFKC", value).split())
        if not value:
            raise ValueError("평가자 이름을 입력해주세요.")
        return value


def normalized_survey(row):
    # Preserve stored responses; version 2 used 1=excellent, version 3 uses 5=excellent.
    from types import SimpleNamespace
    return SimpleNamespace(id=row.id, presenter_id=row.presenter_id, author=row.author,
        evidence=row.evidence, created_at=row.created_at,
        scores=[6 - score for score in row.scores] if row.version == 2 else row.scores)


@router.get("/survey")
def survey(presenter_id: int = Query(ge=1, le=8), db: Session = Depends(get_db)):
    rows = db.query(Project3PresentationSurvey).filter(Project3PresentationSurvey.presenter_id == presenter_id, Project3PresentationSurvey.version.in_([2, SURVEY_VERSION])).all()
    rows = [normalized_survey(row) for row in rows]
    count = len(rows)
    means = [round(sum(row.scores[i] for row in rows) / count, 2) for i in range(10)] if count else [None] * 10
    distribution = [[sum(row.scores[i] == score for row in rows) for score in range(1, 6)] for i in range(10)]
    return {"version": SURVEY_VERSION, "questions": SURVEY_QUESTIONS, "scale": SURVEY_SCALE,
            "presenter_id": presenter_id, "count": count, "means": means,
            "distribution": distribution,
            "overall_mean": round(sum(sum(row.scores) for row in rows) / (count * 10), 2) if count else None}


@router.post("/survey", status_code=201)
def post_survey(payload: SurveyInput, db: Session = Depends(get_db)):
    row = Project3PresentationSurvey(presenter_id=payload.presenter_id, author=payload.author,
        scores=payload.scores, evidence=payload.evidence.strip(), version=SURVEY_VERSION, created_at=datetime.now(timezone.utc))
    db.add(row)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="이 팀에 대한 해당 평가자의 평가가 이미 등록되어 있습니다. 팀과 평가자 이름은 중복 등록할 수 없습니다.") from error
    db.refresh(row)
    return {"id": row.id, "presenter_id": row.presenter_id, "created_at": row.created_at.isoformat()}


def rank_teams(teams):
    ordered = sorted(teams, key=lambda team: (team['overall_mean'] is None,
        -team['overall_mean'] if team['overall_mean'] is not None else 0, team['presenter_id']))
    ranking = []
    last_mean, rank = None, None
    for index, team in enumerate(ordered, 1):
        value = team['overall_mean']
        if value is not None and value != last_mean:
            rank = index
        ranking.append({"rank": rank if value is not None else None,
            "presenter_id": team['presenter_id'], "label": team['label'],
            "count": team['count'], "overall_mean": value})
        last_mean = value
    return ranking


@router.get("/evaluations")
def evaluations(db: Session = Depends(get_db)):
    rows = db.query(Project3PresentationSurvey).filter(Project3PresentationSurvey.version.in_([2, SURVEY_VERSION])).order_by(Project3PresentationSurvey.created_at.desc(), Project3PresentationSurvey.id.desc()).all()
    rows = [normalized_survey(row) for row in rows]
    opinions = db.query(Project3PresentationOpinion).order_by(Project3PresentationOpinion.created_at.desc(), Project3PresentationOpinion.id.desc()).all()
    teams = []
    for index, name in enumerate(PRESENTERS):
        scores = [row.scores for row in rows if row.presenter_id == index + 1]
        count = len(scores)
        label = ("LSH(이상하)" if index == 5 else "LSH(이세현)") if name == "LSH" else name
        comments = [{"id": row.id, "source": "설문 검증 근거·개선 의견", "author": row.author,
                     "content": row.evidence, "created_at": row.created_at.isoformat()}
                    for row in rows if row.presenter_id == index + 1 and row.evidence.strip()]
        comments += [{"id": row.id, "source": "자유 의견", "author": row.author,
                      "content": row.content, "created_at": row.created_at.isoformat()}
                     for row in opinions if row.presenter_id == index + 1 and row.content.strip()]
        comments.sort(key=lambda comment: comment["created_at"], reverse=True)
        teams.append({"presenter_id": index + 1, "label": label, "count": count,
            "comments": comments, "comment_count": len(comments),
            "evidence_missing_count": sum(not row.evidence.strip() for row in rows if row.presenter_id == index + 1),
            "means": [round(sum(score[i] for score in scores)/count, 2) for i in range(10)] if count else [None]*10,
            "distribution": [[sum(score[i] == value for score in scores) for value in range(1,6)] for i in range(10)],
            "overall_mean": round(sum(sum(score) for score in scores)/(count*10), 2) if count else None})
    return {"version": SURVEY_VERSION, "questions": SURVEY_QUESTIONS, "teams": teams, "ranking": rank_teams(teams),
            "count": len(rows), "updated_at": datetime.now(timezone.utc).isoformat(),
            "scale": SURVEY_SCALE,
            "overall": {"count": len(rows),
                "means": [round(sum(row.scores[i] for row in rows)/len(rows),2) for i in range(10)] if rows else [None]*10,
                "overall_mean": round(sum(sum(row.scores) for row in rows)/(len(rows)*10),2) if rows else None,
                "distribution": [[sum(row.scores[i] == value for row in rows) for value in range(1,6)] for i in range(10)]}}


@router.get("/evaluations/report.pdf")
def evaluation_report(db: Session = Depends(get_db)):
    from app.services.presentation_report import create_report
    snapshot = evaluations(db)
    return Response(create_report(snapshot), media_type="application/pdf", headers={
        "Content-Disposition": 'attachment; filename="project3-evaluation-report-20261001-20261021.pdf"',
        "Cache-Control": "no-store"})
