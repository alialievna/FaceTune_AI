# Монетизация

## Модели

### 1. Free Tier
- 3 видео/месяц
- Watermark на выходе
- Max 30 сек, 720p
- Очередь: низкий приоритет

### 2. Pay-per-render
- $0.99 за видео
- Без watermark
- До 60 сек, 1080p
- Credits: покупаются пакетами (10 = $8.99)

### 3. Subscription
| Plan | Цена | Видео/мес | Доп. |
|------|------|-----------|------|
| Free | $0 | 3 | Watermark |
| Pro | $9.99 | 30 | No watermark |
| Business | $29.99 | 100 | API access |

---

## Stripe Integration

```
Events:
├── customer.subscription.created
├── customer.subscription.updated
├── customer.subscription.deleted
├── invoice.paid
└── invoice.payment_failed
```

**Webhook**: `/webhooks/stripe` — idempotent, verify signature.

---

## Credits System

- 1 credit = 1 видео
- Subscription: credits пополняются 1-го числа
- Pay-per-render: credits не сгорают
- Deduct: при dispatch job (не при completion)

---

## Watermark

- **Free**: полупрозрачный, corner, нельзя убрать
- **Paid**: нет или subtle (опционально для брендинга)
