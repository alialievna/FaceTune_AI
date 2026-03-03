FROM python:3.11-slim

RUN apt-get update && apt-get install -y ffmpeg libgl1 libglib2.0-0 build-essential wget && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download inswapper model (GitHub URL broken, use HuggingFace)
RUN mkdir -p /root/.insightface/models && \
    wget "https://huggingface.co/ezioruan/inswapper_128.onnx/resolve/main/inswapper_128.onnx" \
    -O /root/.insightface/models/inswapper_128.onnx

# Pre-download buffalo_l (face detection)
COPY download_models.py .
RUN python download_models.py || true

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
