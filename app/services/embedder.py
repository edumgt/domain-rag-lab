"""의존성이 없는 경량 해시 임베딩 서비스.

문자 단위 n-gram을 고정 차원 벡터로 투영한다. 외부 모델 다운로드나
대규모 모델 의존성 없이도 한국어·영문 금융 문서의 키워드 유사도를 안정적으로 비교할 수 있다.
"""

import hashlib
import math
import re

from app.core.config import settings


class EmbeddingService:
    def __init__(self, model_name: str):
        # 기존 설정 호환을 위해 model_name은 받되, 해시 임베딩에서는 사용하지 않는다.
        self.model_name = model_name
        self.dimension = settings.embedding_dim

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return [self._embed(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._embed(text)

    def _embed(self, text: str) -> list[float]:
        vector = [0.0] * self.dimension
        normalized = re.sub(r"\s+", " ", text.lower()).strip()
        if not normalized:
            return vector

        # 단어와 문자 2·3-gram을 함께 사용해 한국어 조사 변화와 영문 형태 변화를 완화한다.
        tokens = re.findall(r"[\w가-힣]+", normalized)
        features = list(tokens)
        compact = re.sub(r"\s+", "", normalized)
        for size in (2, 3):
            features.extend(compact[index:index + size] for index in range(max(0, len(compact) - size + 1)))

        for feature in features:
            digest = hashlib.blake2b(feature.encode("utf-8"), digest_size=8).digest()
            value = int.from_bytes(digest, byteorder="big")
            index = value % self.dimension
            vector[index] += 1.0 if value & 1 else -1.0

        norm = math.sqrt(sum(value * value for value in vector))
        return [value / norm for value in vector] if norm else vector
