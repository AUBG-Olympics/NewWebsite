FROM python:3.11-slim

# Match `cd backend`
WORKDIR /backend

# Copy backend files
COPY . .

# Install Python deps
RUN pip install --no-cache-dir -r requirements.txt

# Run exactly what gum-menu runs
CMD ["python", "-m", "src.entry"]
