"""Project 3 owns a PostgreSQL database, ORM metadata and connection pool."""
from functools import lru_cache
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, JSON, MetaData, Table, create_engine, inspect, select
from sqlalchemy.engine import URL
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

Project3Base = declarative_base()


class Project3MigrationState(Project3Base):
    __tablename__ = 'project3_migration_state'
    id = Column(Integer, primary_key=True)
    source_counts = Column(JSON, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=False)


@lru_cache(maxsize=1)
def get_project3_engine():
    if settings.project3_postgres_db == settings.postgres_db or settings.project3_postgres_user == settings.postgres_user:
        raise RuntimeError('Project3 database and role must differ from the shared database')
    if not settings.project3_postgres_password:
        raise RuntimeError('PROJECT3_POSTGRES_PASSWORD must be configured; shared DB fallback is forbidden')
    return create_engine(URL.create('postgresql+psycopg2',
        username=settings.project3_postgres_user, password=settings.project3_postgres_password,
        host=settings.postgres_host, port=settings.postgres_port, database=settings.project3_postgres_db),
        pool_pre_ping=True, pool_size=5, max_overflow=5)


@lru_cache(maxsize=1)
def project3_session_factory():
    return sessionmaker(autocommit=False, autoflush=False, bind=get_project3_engine())


def get_project3_db():
    with project3_session_factory()() as db:
        yield db


def initialize_project3_database(source_engine):
    """Run before accepting requests; copy legacy P3 rows once, atomically.

    The source tables remain untouched for rollback. Migration runs only after
    the old API container is stopped, preventing writes during cutover.
    """
    from sqlalchemy import text
    target_engine = get_project3_engine()
    Project3Base.metadata.create_all(bind=target_engine)
    state = Project3MigrationState.__table__
    with target_engine.begin() as target:
        # Serialize initialization if deployment later uses multiple workers.
        target.execute(text("SELECT pg_advisory_xact_lock(30720261022)"))
        if target.execute(select(state.c.id).where(state.c.id == 1)).first():
            return
        counts = {}
        with source_engine.connect().execution_options(isolation_level='REPEATABLE READ') as source:
            source_tables = set(inspect(source).get_table_names())
            for name in ['project3_presentation_draw', 'project3_presentation_draw_usage',
                         'project3_presentation_opinions', 'project3_presentation_surveys']:
                table = Project3Base.metadata.tables[name]
                if target.execute(select(table.c.id).limit(1)).first():
                    raise RuntimeError('Project3 destination contains data without migration marker; manual reconciliation required')
                rows = []
                if name in source_tables:
                    old_table = Table(name, MetaData(), autoload_with=source)
                    rows = [dict(row) for row in source.execute(select(old_table)).mappings()]
                if rows:
                    target.execute(table.insert(), rows)
                    target.execute(text("SELECT setval(pg_get_serial_sequence(:table_name, 'id'), :max_id, true)"),
                                   {'table_name':name,'max_id':max(row['id'] for row in rows)})
                counts[name] = len(rows)
        target.execute(state.insert().values(id=1, source_counts=counts, completed_at=datetime.now(timezone.utc)))
