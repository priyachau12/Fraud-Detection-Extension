# Use official Python image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg \
    libglib2.0-0 \
    libnss3 \
    libgconf-2-4 \
    libfontconfig1 \
    libxss1 \
    libasound2 \
    libxshmfence1 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    && apt-get clean

# Copy dependency files
COPY requirements.txt .

# Install Python dependencies
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Install Playwright and browsers
RUN pip install playwright && playwright install --with-deps

# Copy project files
COPY . .

# Expose port
EXPOSE 5000

# Run the app
CMD ["python", "run.py"]
