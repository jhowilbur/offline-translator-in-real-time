# Use NVIDIA CUDA base image with Python
FROM nvidia/cuda:12.9.1-cudnn-devel-ubuntu24.04

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
    build-essential \
    ffmpeg \
    libsndfile1 \
    libportaudio2 \
    libportaudiocpp0 \
    portaudio19-dev \
    libasound2-dev \
    libpulse-dev \
    git \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Create and set the working directory
WORKDIR /app

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Create virtual environment and install dependencies
RUN python3 -m venv venv
RUN venv/bin/pip install --upgrade pip
RUN venv/bin/pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
RUN venv/bin/pip install -r requirements.txt

# Copy the application code
COPY bot.py .
COPY bot_service.py .
COPY connection_manager.py .
COPY server.py .

# Expose the port that the server runs on
EXPOSE 7860

# Set the default command to run the server
CMD ["venv/bin/python", "server.py", "--host", "0.0.0.0", "--port", "7860"]