FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

# docker CLI only (no daemon): the LEAN local runner talks to the host's Docker through
# a mounted /var/run/docker.sock and starts quantconnect/lean containers with `docker run`.
ARG DOCKER_CLI_VERSION=27.5.1
RUN arch="$(uname -m)" \
    && curl -fsSL "https://download.docker.com/linux/static/stable/${arch}/docker-${DOCKER_CLI_VERSION}.tgz" \
       | tar -xz -C /usr/local/bin --strip-components=1 docker/docker \
    && docker --version

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY frontend/ ./frontend/
COPY data/ ./data/
COPY streamlit_app.py .

RUN mkdir -p /app/data/uploads

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
