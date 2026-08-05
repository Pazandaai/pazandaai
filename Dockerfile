FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY bot/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy bot code
COPY bot/ ./

# Set python path
ENV PYTHONPATH=/app

# Run bot main module
CMD ["python", "-m", "app.main"]
