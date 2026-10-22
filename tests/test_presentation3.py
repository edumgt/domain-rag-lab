from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.database import get_db
from app.api.routes import presentation as p2, presentation3 as p3


def test_project3_presentation_is_separate():
    engines=[create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool) for _ in range(2)]
    for module,prefix,engine in [(p2,'',engines[0]),(p3,'Project3',engines[1])]:
        for name in ['PresentationDraw','PresentationDrawUsage','PresentationOpinion','PresentationSurvey']:
            getattr(module,prefix+name).__table__.create(engine)
    app=FastAPI();app.include_router(p2.router);app.include_router(p3.router)
    def override(engine):
        factory=sessionmaker(bind=engine)
        def database():
            with factory() as db:yield db
        return database
    app.dependency_overrides[get_db]=override(engines[0])
    app.dependency_overrides[p3.get_db]=override(engines[1])
    with TestClient(app) as client:
        original=client.get('/presentation/order').json()
        assert len(client.get('/presentation3/order').json()['assignments'])==8
        assert client.post('/presentation3/order/randomize').status_code==200
        assert client.get('/presentation/order').json()==original
        assert client.post('/presentation3/opinions',json={'presenter_id':1,'author':'QA','content':'project3 only'}).status_code==201
        assert len(client.get('/presentation3/opinions').json()['opinions'])==1
        assert not client.get('/presentation/opinions').json()['opinions']
        payload={'presenter_id':1,'author':'QA','scores':[5]*10,'evidence':'project3 survey'}
        assert client.post('/presentation3/survey',json=payload).status_code==201
        assert client.get('/presentation3/evaluations').json()['count']==1
        assert client.get('/presentation/evaluations').json()['count']==0
        from io import BytesIO
        from pypdf import PdfReader
        report = client.get('/presentation3/evaluations/report.pdf')
        assert report.status_code == 200
        reader = PdfReader(BytesIO(report.content))
        assert reader.metadata.title == '나만의 투자 인디케이터 개발 및 성과 검증 프로젝트 중 팀별 소분과 수행'
        text = ''.join(reader.pages[0].extract_text().split())
        assert ''.join('나만의 투자 인디케이터 개발 및 성과 검증 프로젝트 중 팀별 소분과 수행'.split()) in text
        assert '로보어드바이저' not in text


def test_project3_metadata_and_dependency_are_isolated():
    from app.core.database import Base
    from app.core.project3_database import Project3Base
    assert p2.get_db is not p3.get_db
    assert not any(name.startswith('project3_') for name in Base.metadata.tables)
    assert all(name.startswith('project3_') for name in Project3Base.metadata.tables)


def test_project3_rejects_shared_database_role_and_missing_secret(monkeypatch):
    import pytest
    from app.core import project3_database as db3
    for field, value in [('project3_postgres_db', db3.settings.postgres_db),
                         ('project3_postgres_user', db3.settings.postgres_user),
                         ('project3_postgres_password', '')]:
        with monkeypatch.context() as context:
            context.setattr(db3.settings, field, value)
            db3.get_project3_engine.cache_clear()
            with pytest.raises(RuntimeError):db3.get_project3_engine()
    db3.get_project3_engine.cache_clear()
