# Cost Breakdown & Scaling

## 1. GPU Requirements для 1000 рендеров/день

### Расчёт

- **1 видео 30 сек** ≈ 900 кадров @ 30fps
- **Inference time** на T4: ~50ms/frame → 45 сек на видео
- **С учётом** extraction, encoding, I/O: **~2.5 мин на видео**

```
1000 видео × 2.5 мин = 2500 мин = 41.7 GPU-часов/день
```

### Рекомендация

| Сценарий | GPU nodes | Тип | Стоимость/день |
|----------|-----------|-----|-----------------|
| Пиковая нагрузка (8h) | 3-4 | g4dn.xlarge | ~$50 |
| Равномерная (24h) | 2 | g4dn.xlarge | ~$25 |
| С spot instances | 2 | g4dn.xlarge spot | ~$8 |

**Вывод**: **2-3 GPU nodes (T4)** достаточно для 1000 рендеров/день при равномерной нагрузке.

---

## 2. Средняя стоимость 1 видео (30 сек)

| Компонент | Стоимость |
|-----------|-----------|
| GPU inference (2.5 min @ $0.01/min) | $0.025 |
| S3 storage (100MB, 30 days) | $0.002 |
| CloudFront egress (100MB) | $0.008 |
| Moderation (CPU) | $0.001 |
| **Total** | **~$0.036** |

---

## 3. Снижение стоимости inference

| Метод | Экономия |
|-------|----------|
| **TensorRT** вместо ONNX | 30-50% faster → меньше GPU time |
| **FP16** inference | 2x throughput, minimal quality loss |
| **Batch 8** вместо 4 | 1.5x throughput |
| **Spot instances** | 60-70% cheaper |
| **Scale to zero** | $0 когда нет jobs |
| **Regional GPU** (не us-west) | 20% cheaper |
| **Reserved 1yr** | 40% discount |

**Потенциал**: $0.036 → **$0.015** при оптимизации.

---

## 4. Unit Economics

### Free Tier
- 3 видео/месяц
- С watermark
- **CAC**: $0.11 (3 × $0.036)
- **Monetization**: upsell to paid

### Pay-per-render
- $0.99 за видео
- **Cost**: $0.036
- **Gross margin**: 96%

### Subscription $9.99/mo
- 30 видео включено
- **Cost**: 30 × $0.036 = $1.08
- **Gross margin**: 89%

### Subscription $29.99/mo (Pro)
- 100 видео
- **Cost**: $3.60
- **Gross margin**: 88%

---

## 5. Scaling до 100k пользователей

### Допущения
- 5% MAU активны (5000 активных)
- 2 рендера/пользователь/месяц = 10,000 рендеров/месяц
- Пик: 500 рендеров/день

### Инфраструктура

| Компонент | Конфигурация |
|-----------|--------------|
| API | 5-10 pods (HPA) |
| GPU | 2-3 nodes (scale on queue) |
| PostgreSQL | db.r5.large, read replica |
| Redis | cache.r5.large (cluster) |
| **Est. monthly** | **$3,000-5,000** |

### При 100k MAU (5% active = 5k)
- 10,000 рендеров/месяц
- Revenue: ~$5,000 (mixed free/paid)
- Infrastructure: ~$4,000
- **Break-even** при 20% paid conversion

---

## 6. Bottlenecks Summary

| Bottleneck | Решение |
|------------|---------|
| **GPU inference** | Worker pool, batch, TensorRT |
| **S3 upload** | Presigned URLs, direct upload |
| **DB connections** | PgBouncer, connection pool |
| **Queue depth** | Auto-scale GPU workers |
| **Encoding** | NVENC GPU, не CPU |
| **Cold start** | Min 1 GPU worker, pre-warmed |
