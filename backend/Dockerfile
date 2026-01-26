FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python deps
RUN pip install --no-cache-dir -r requirements.txt

# Copy entire backend directory structure
COPY . .

# Expose backend port
EXPOSE 4000

# Run exactly what gum-menu runs
CMD ["uvicorn", "src.entry:app", "--host", "0.0.0.0", "--port", "4000", "--reload"]
