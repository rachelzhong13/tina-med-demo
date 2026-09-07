FROM docker.m.daocloud.io/library/python:3.12-slim

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY backend/data ./data
COPY knowledge ./knowledge
ENV PYTHONUNBUFFERED=1
ENV KNOWLEDGE_DIR=/app/knowledge
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
