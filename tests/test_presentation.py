from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.api.routes.presentation import router, PresentationDraw, PresentationOpinion, PresentationDrawUsage
from app.core.database import get_db


def test_shared_draw_and_feedback():
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    PresentationDraw.__table__.create(engine)
    PresentationDrawUsage.__table__.create(engine)
    PresentationOpinion.__table__.create(engine)
    session = sessionmaker(bind=engine)
    def database():
        with session() as db:
            yield db
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = database
    with TestClient(app) as client:
        first = client.get('/presentation/order').json()
        assert first == client.get('/presentation/order').json()
        people = first['assignments']
        assert sorted(p['order'] for p in people) == list(range(1, 9))
        assert [p['name'] for p in people] == ['팀1','팀2','김정','CKS','OTH','LSH','KIJ','LSH']
        assert people[5]['label'] != people[7]['label']
        assert first["clicks"] == 0 and not first["locked"]
        for attempt in range(1,4):
            updated = client.post('/presentation/order/randomize')
            assert updated.status_code == 200
            current = updated.json()
            assert current['clicks'] == attempt
            assert current['remaining'] == 3-attempt
            assert current['locked'] == (attempt == 3)
            assert [p['order'] for p in current['assignments']] == list(range(1,9))
            assert {p['id']:p['order'] for p in current['assignments']} != {p['id']:p['order'] for p in people}
            assert {p['id']:p['label'] for p in current['assignments']} == {p['id']:p['label'] for p in people}
            assert client.get('/presentation/order').json() == current
            people = current['assignments']
        assert client.post('/presentation/order/randomize').status_code == 409
        assert client.get('/presentation/order').json() == current
        with TestClient(app) as other:
            assert other.post('/presentation/order/randomize').status_code == 409
            assert other.get('/presentation/order').json() == current
        payload = {'presenter_id': 6, 'author': '테스트', 'content': '<script>alert(1)</script> 좋은 발표'}
        posted = client.post('/presentation/opinions', json=payload)
        assert posted.status_code == 201
        assert client.get('/presentation/opinions').json()['opinions'][0]['content'] == payload['content']
        assert client.post('/presentation/opinions', json=payload).status_code == 409
        assert client.post('/presentation/opinions', json={**payload, 'presenter_id': 9}).status_code == 422
        assert client.post('/presentation/opinions', json={**payload, 'content': '  '}).status_code == 422
        assert client.post('/presentation/opinions', json={**payload, 'content': 'x'*2001}).status_code == 422


def test_survey_validation_and_presenter_summary():
    from app.api.routes.presentation import PresentationSurvey
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    PresentationSurvey.__table__.create(engine)
    PresentationOpinion.__table__.create(engine)
    session = sessionmaker(bind=engine)
    def database():
        with session() as db:
            yield db
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = database
    with TestClient(app) as client:
        initial = client.get('/presentation/survey?presenter_id=6').json()
        assert len(initial['questions']) == 10 and len(initial['scale']) == 5
        for question in initial['questions']:
            assert question['guidance'] and question['example'] and len(question['ratings']) == 5
            for domain_word in ['투자금', '투자 성향', '포트폴리오', '주가 API', '계좌', '생활비', '추천 규칙']:
                assert domain_word not in str(question)
        assert initial['count'] == 0 and initial['overall_mean'] is None
        assert initial['means'] == [None] * 10
        payload = {'presenter_id': 6, 'author': '평가자A', 'scores': [1]*10, 'evidence': '시연 확인'}
        assert client.post('/presentation/survey', json=payload).status_code == 201
        assert client.post('/presentation/survey', json=payload).status_code == 409
        assert client.post('/presentation/survey', json={**payload,'author':'평가자B','scores':[5]*10}).status_code == 201
        result = client.get('/presentation/survey?presenter_id=6').json()
        assert result['count'] == 2 and result['overall_mean'] == 3
        assert result['means'] == [3] * 10
        assert result['distribution'] == [[1,0,0,0,1]] * 10
        assert client.get('/presentation/survey?presenter_id=8').json()['count'] == 0
        for scores in ([1]*9, [1]*11, [0]*10, [6]*10, [True]*10, ['1']*10):
            assert client.post('/presentation/survey',json={**payload,'scores':scores}).status_code == 422
        assert client.post('/presentation/survey',json={**payload,'author':'  '}).status_code == 422
        assert client.get('/presentation/survey?presenter_id=9').status_code == 422
        # Same key is rejected even when scores, evidence, or case differ.
        assert client.post('/presentation/survey',json={**payload,'author':'  평가자a  ','scores':[4]*10,'evidence':'수정'}).status_code == 409
        assert client.post('/presentation/survey',json={**payload,'presenter_id':8}).status_code == 201
        summary = client.get('/presentation/evaluations').json()
        assert summary['count'] == 3 and len(summary['teams']) == 8
        assert [team['presenter_id'] for team in summary['ranking'][:2]] == [8,6]
        assert [team['rank'] for team in summary['ranking'][:2]] == [1,2]
        assert all(team['rank'] is None for team in summary['ranking'][2:])
        by_id = {team['presenter_id']:team for team in summary['teams']}
        assert by_id[6]['count'] == 2 and by_id[6]['overall_mean'] == 3
        assert by_id[8]['count'] == 1 and by_id[8]['means'] == [1]*10
        assert by_id[1]['count'] == 0 and by_id[1]['overall_mean'] is None
        assert by_id[6]['comment_count'] == 2
        assert by_id[6]['comments'][0]['content'] == '시연 확인'
        assert by_id[6]['comments'][0]['author'] == '평가자B'
        assert by_id[1]['comments'] == []
        assert client.post('/presentation/opinions', json={'presenter_id':6,'author':'의견평가자','content':'개선 제안\n<b>원문 표시</b>'}).status_code == 201
        refreshed = client.get('/presentation/evaluations').json()
        assert refreshed['count'] == 3
        assert refreshed['teams'][5]['comment_count'] == 3
        assert any(comment['source']=='자유 의견' and comment['content']=='개선 제안\n<b>원문 표시</b>' for comment in refreshed['teams'][5]['comments'])
        # Direct DB inserts must obey the key, independently of API checks.
        from sqlalchemy.exc import IntegrityError
        import pytest
        from datetime import datetime, timezone
        with session() as db:
            db.add(PresentationSurvey(presenter_id=6, author='평가자a', version=1,
                scores=[2]*10, evidence='',created_at=datetime.now(timezone.utc)))
            with pytest.raises(IntegrityError):
                db.commit()
            db.rollback()
        pdf = client.get('/presentation/evaluations/report.pdf')
        assert pdf.status_code == 200 and pdf.headers['content-type'] == 'application/pdf'
        assert 'attachment' in pdf.headers['content-disposition']
        assert pdf.content.startswith(b'%PDF-')
        from pypdf import PdfReader
        from io import BytesIO
        reader = PdfReader(BytesIO(pdf.content))
        assert all(float(page.mediabox.height) > float(page.mediabox.width) for page in reader.pages)
        text = '\n'.join(page.extract_text() for page in reader.pages)
        assert reader.metadata.title == '나만의 로보 어드바이저 개발 및 성과 검증 프로젝트 과정 중 팀별 소분과 프로젝트 수행결과'
        assert '나만의 로보 어드바이저' in text and '팀별소분과프로젝트수행결과' in ''.join(text.split())
        assert '2026년 10월 1일 ~ 10월 21일' in text
        assert '전체 10문항 질문 및 답변 통계' in text
        assert '창의성' in text and '실 제품화' in text
        assert text.count('파이 차트') >= 9
        assert '색상 조각은 문항별' in text
        assert '50.0%' in text and '100.0%' in text and '3.00' in text
        assert '평가자A' in text and '팀별 평가자 주관식 상세 의견' in text
        assert '문항별 채점 기준과 쉬운 예시' in text and '검색어를 입력하면' in text
        assert '시연 확인' in text and '의견평가자' in text and '<b>원문 표시</b>' in text
        for label in ['팀1','팀2','김정','CKS','OTH','LSH(이상하)','KIJ','LSH(이세현)']:
            assert label in text
        Path = __import__('pathlib').Path
        Path('/tmp/project2-report-test.pdf').write_bytes(pdf.content)


def test_ranking_ties_and_unrated():
    from app.api.routes.presentation import rank_teams
    teams = [{"presenter_id":i,"label":str(i),"count":0 if value is None else 1,"overall_mean":value} for i,value in enumerate([None,3,1,1,2],1)]
    result = rank_teams(teams)
    assert [team['presenter_id'] for team in result] == [3,4,5,2,1]
    assert [team['rank'] for team in result] == [1,1,3,4,None]
