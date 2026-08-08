from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Domain RAG MVP"
    app_env: str = "dev"

    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_collection: str = "domain_docs"

    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "ragdb"
    postgres_user: str = "raguser"
    postgres_password: str = "ragpass"

    redis_host: str = "localhost"
    redis_port: int = 6379

    embedding_model: str = "hashing-384"
    embedding_dim: int = 384

    vllm_base_url: str = "http://localhost:8001/v1"
    vllm_model: str = "Qwen/Qwen2.5-7B-Instruct"
    vllm_api_key: str = "EMPTY"

    upload_dir: str = "/app/data/uploads"
    chunk_size: int = 500
    chunk_overlap: int = 80
    top_k: int = 4

    # 하이브리드 검색: 벡터·키워드 결과 혼합 가중치 (0.0~1.0, 1.0=벡터만)
    hybrid_vector_weight: float = 0.6
    # 세션 단기 기억: 최근 대화 몇 턴을 컨텍스트에 포함할지
    session_memory_turns: int = 5
    # 장기 기억 pgvector 유사도 임계값 (코사인 거리 기준, 낮을수록 유사)
    long_term_memory_threshold: float = 0.4
    long_term_memory_top_k: int = 3

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


settings = Settings()
