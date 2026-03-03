# Face Swap SaaS — Production Design

Полная документация production-ready платформы для AI Face Swap Video.

## Структура документации

| Документ | Содержание |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Системная архитектура, сервисы, очереди, GPU pool |
| [AI_PIPELINE.md](./AI_PIPELINE.md) | Детальный AI pipeline: detection → swap → encode |
| [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) | Docker, Kubernetes, CI/CD, cost estimation |
| [COST_AND_SCALING.md](./COST_AND_SCALING.md) | Unit economics, scaling, bottlenecks |

## Backend примеры кода

```
backend/
├── app/
│   ├── api/v1/endpoints/
│   │   ├── upload.py      # Presigned URLs, create-job
│   │   └── jobs.py       # Status polling, download
│   └── workers/
│       ├── task_worker.py      # Moderation, post-processing
│       └── inference_worker.py # GPU face swap
```

## REST API Endpoints

| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/upload/presigned/video` | Получить presigned URL для видео |
| POST | `/upload/presigned/face` | Получить presigned URL для фото |
| POST | `/upload/create-job` | Создать job после загрузки |
| GET | `/jobs/{id}/status` | Poll статуса (progress) |
| GET | `/jobs/{id}/download` | Redirect на скачивание |

## Quick Start

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload

# Celery workers
celery -A app.workers.task_worker worker -Q default -l info
celery -A app.workers.inference_worker worker -Q inference -l info
```

## Ключевые решения

1. **Modular Monolith + GPU Microservice** — баланс простоты и масштабируемости
2. **Presigned S3** — клиент загружает напрямую, разгрузка API
3. **Redis + Celery** — очереди, достаточно для 100k users
4. **GPU Auto-scaling** — Karpenter/Cluster Autoscaler по глубине очереди
5. **Cost**: ~$0.03/video, margin 96% при $0.99 pay-per-render
