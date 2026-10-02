FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi==0.116.1 uvicorn==0.35.0 'numpy>=1.26,<3' 'scikit-learn>=1.5,<2'
COPY deploy/walk-forward/main.py ./
COPY app/api/routes/walk_forward.py ./simulation.py
COPY frontend/walk-forward.html ./frontend/walk-forward.html
COPY frontend/assets/walk-forward.js frontend/assets/walk-forward.css frontend/assets/walk-forward-page.js ./frontend/assets/
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
