# Безопасность и модерация

## NSFW Detection

| Решение | Плюсы | Минусы |
|---------|-------|--------|
| **NudeNet** | Open-source, локально | False positives |
| **OpenAI Moderation API** | Точность | $, latency |
| **AWS Rekognition** | Managed | Дорого |

**Рекомендация**: NudeNet для первого прохода + OpenAI для edge cases (опционально).

```python
# NudeNet example
from nudenet import NudeDetector
detector = NudeDetector()
detections = detector.detect("frame.jpg")
# Block if unsafe score > threshold
```

---

## Consent & Abuse Prevention

1. **Face similarity threshold** — source face должен совпадать с загруженным фото (embedding cosine > 0.6)
2. **Consent flow** — пользователь подтверждает, что имеет права на использование фото
3. **Deepfake abuse** — блокировка при детекции известных личностей (опционально: политики, знаменитости)
4. **Rate limiting** — 10 jobs/hour для free, 50 для paid

---

## GDPR Compliance

- **Data retention**: uploads 24h, outputs 30 days (free) / 1 year (paid)
- **Right to deletion**: полное удаление по запросу (S3 + DB)
- **Data processing agreement**: для EU клиентов
- **Encryption at rest**: S3 SSE-S256
- **Encryption in transit**: TLS 1.3

---

## Data Retention Policy

| Данные | Retention |
|--------|-----------|
| Raw uploads | 24 часа (или до job completion) |
| Face photos | До удаления аккаунта |
| Output videos (free) | 30 дней |
| Output videos (paid) | 1 год |
| Job metadata | 2 года (для billing) |
| Logs | 90 дней |
