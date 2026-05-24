# JALAGEL OS Pro - Python Flask Edition
# Docker Image for GitHub Container Registry

FROM python:3.11-slim

LABEL org.opencontainers.image.title="JALAGEL OS Pro"
LABEL org.opencontainers.image.description="Web-based Operating System with 50+ Apps & SSL Certificate Store"
LABEL org.opencontainers.image.source="https://github.com/s200077761/jalagel-os"
LABEL org.opencontainers.image.author="MOHAMMED SAAD MOHAMMED ALOHAYDIB"

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--threads", "2", "--timeout", "60", "--access-logfile", "-", "--error-logfile", "-", "app:app"]
