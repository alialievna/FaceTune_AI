# Face Swap SaaS — Production-Ready Architecture

## 1. Системная архитектура

### 1.1 Выбор: Microservices vs Modular Monolith

**Рекомендация: Hybrid — Modular Monolith с выделенными GPU-сервисами**

| Критерий | Решение |
|----------|---------|
| Команда < 10 | Modular Monolith (API + Auth + Billing в одном deploy) |
| GPU workload | Отдельный microservice (изоляция, автоскейлинг) |
| Масштабирование | Horizontal scaling по сервисам |

**Почему не чистый microservices на старте:**
- Высокая операционная сложность
- Сетевые задержки между сервисами
- Сложность distributed tracing
- GPU workers всё равно изолированы

---

### 1.2 Архитектурная диаграмма

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CDN (CloudFront / Cloudflare)                         │
│                              Static assets, video delivery, caching                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              Load Balancer (ALB / nginx)                                  │
│                         SSL termination, health checks, routing                           │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    ▼                           ▼                           ▼
┌──────────────────────────┐    ┌──────────────────────────┐    ┌──────────────────────────┐
│      API Gateway         │    │   Next.js Frontend        │    │   WebSocket Server        │
│   (Kong / AWS API GW)     │    │   (SSR, API routes)      │    │   (Progress, real-time)   │
│   Rate limiting           │    │   NextAuth               │    │   Socket.io / Pusher      │
│   JWT validation          │    │   Dashboard, Gallery     │    │                          │
└──────────────────────────┘    └──────────────────────────┘    └──────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         CORE APPLICATION (Modular Monolith)                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │
│  │ Auth Module │ │ Billing     │ │ Media       │ │ Moderation  │ │ Job Orchestrator     │  │
│  │ JWT, OAuth  │ │ Stripe      │ │ Processing  │ │ NSFW, Face  │ │ Task dispatch        │  │
│  │ Sessions    │ │ Credits     │ │ Presigned   │ │ similarity  │ │ Status tracking      │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         MESSAGE QUEUE (Redis / RabbitMQ)                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐   │
│  │ upload-queue    │  │ inference-queue │  │ encode-queue    │  │ dead-letter-queue   │   │
│  │ (priority)      │  │ (GPU workers)   │  │ (GPU optional)  │  │ (retry 3x)          │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         GPU WORKER POOL (Kubernetes)                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  GPU Node 1 (A10G/T4)     │  GPU Node 2     │  GPU Node N     │  Auto-scaling 0→N    │  │
│  │  - Face detection         │  - Face swap    │  - Batch 4-8   │  - Scale on queue   │  │
│  │  - Inference (ONNX)       │  - Encoding     │  - VRAM 24GB   │  - Scale to zero    │  │
│  └─────────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │ PostgreSQL   │  │ Redis        │  │ S3/MinIO     │  │ Elasticsearch (optional)     │  │
│  │ Jobs, Users  │  │ Cache, Queue │  │ Videos, Img  │  │ Logs, search                 │  │
│  │ Billing      │  │ Sessions     │  │ Presigned    │  │                              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 1.3 Разделение сервисов (детально)

| Сервис | Технология | Scaling | Описание |
|--------|------------|---------|----------|
| **API Gateway** | Kong / AWS API GW | Horizontal | Rate limit, JWT validation, routing |
| **Auth** | FastAPI + JWT | В составе Core | Login, register, OAuth, sessions |
| **Billing** | FastAPI + Stripe | В составе Core | Subscriptions, credits, webhooks |
| **Media Processing** | FastAPI + Celery | В составе Core | Upload, presigned URLs, metadata |
| **AI Inference** | Python + ONNX/TensorRT | **GPU nodes** | Face swap, detection, encoding |
| **Storage** | S3/MinIO | Managed | Object storage, lifecycle |
| **Moderation** | FastAPI + NudeNet | CPU workers | NSFW, face similarity check |
| **Webhook** | FastAPI | В составе Core | Job completion, billing events |

---

### 1.4 Очереди задач

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Upload    │────▶│  moderation-q    │────▶│  inference-q    │
│   (S3)      │     │  (NSFW check)    │     │  (GPU workers)  │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                      │
                                                      ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Webhook    │◀────│  encode-q        │◀────│  Face swap done │
│  Notify     │     │  (watermark)     │     │  Per-frame      │
└─────────────┘     └──────────────────┘     └─────────────────┘
```

**Рекомендация: Redis + Celery** (проще) или **RabbitMQ** (надёжнее для критичных задач)

- **Redis**: быстрее, проще, достаточно для 100k users
- **RabbitMQ**: гарантированная доставка, dead-letter, приоритеты
- **Kafka**: overkill для face swap (не нужен event sourcing)

---

### 1.5 GPU Worker Pool

```
Kubernetes GPU Node Pool:
├── Node type: g4dn.xlarge (1x T4) / g5.xlarge (1x A10G)
├── Min replicas: 1 (или 0 для cost savings)
├── Max replicas: 20
├── Scale trigger: queue depth > 5 jobs
├── Scale down: idle 10 min
└── VRAM per worker: 16-24 GB
```

---

### 1.6 Object Storage (S3-compatible)

```
Bucket structure:
s3://faceapp-prod/
├── uploads/           # Raw uploads (temp, 24h TTL)
│   └── {user_id}/{job_id}/video.mp4
├── faces/             # User face photos (encrypted at rest)
│   └── {user_id}/face_{hash}.jpg
├── outputs/           # Final videos (CDN origin)
│   └── {job_id}/output.mp4
├── templates/         # Catalog templates
│   └── {template_id}/preview.mp4
└── thumbnails/        # Preview images
```

---

### 1.7 CDN

- **CloudFront / Cloudflare** для outputs/
- Cache-Control: max-age=31536000 для готовых видео
- Signed URLs для приватного контента
- Geo-routing для низкой латентности

---

### 1.8 Webhook система

```
Events:
├── job.completed     → User notification, billing deduction
├── job.failed        → Retry logic, user alert
├── subscription.updated → Sync credits
└── moderation.flagged → Block job, notify admin
```

---

### 1.9 Horizontal Scaling стратегия

| Компонент | Метрика | Действие |
|-----------|---------|----------|
| API pods | CPU > 70% | +2 replicas |
| GPU workers | Queue depth > 5 | +1 GPU node |
| Redis | Memory > 80% | Redis Cluster |
| PostgreSQL | Connections > 80% | Read replicas |

---

## 2. Observability

```
┌─────────────────────────────────────────────────────────────────┐
│  Prometheus          │  Grafana           │  Loki / ELK          │
│  - Job duration      │  - Dashboards      │  - Structured logs   │
│  - Queue depth       │  - Alerts          │  - Trace IDs         │
│  - GPU utilization   │  - SLO tracking    │  - Error aggregation│
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Потенциальные Bottlenecks

1. **GPU inference** — главный bottleneck, решается пулом воркеров
2. **S3 upload bandwidth** — presigned URLs, клиент upload напрямую
3. **PostgreSQL connections** — connection pooling (PgBouncer)
4. **Redis single-thread** — Redis Cluster при >100k RPS
5. **Video encoding** — GPU NVENC ускоряет в 10x
