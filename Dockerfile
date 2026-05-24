FROM python:3.11

LABEL org.opencontainers.image.title="JALAGEL OS Pro"
LABEL org.opencontainers.image.description="Web-based Operating System with 50+ Apps & SSL Certificate Store"
LABEL org.opencontainers.image.source="https://github.com/s200077761/jalagel-os"

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure instance directory exists
RUN mkdir -p /app/instance && chmod 777 /app/instance

EXPOSE 10000

ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1
ENV PORT=10000

CMD exec gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --threads 2 --timeout 120
