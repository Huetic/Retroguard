FROM python:3.12-slim AS base

# Install runtime OS dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        libgl1 \
        libglib2.0-0 \
        libfreetype6 \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user
RUN useradd --create-home --shell /bin/bash app

# Install Python deps before copying source (layer-cache efficiency)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Ensure uploads dir exists and is owned by app user
RUN mkdir -p uploads && chown -R app:app /app

USER app

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
