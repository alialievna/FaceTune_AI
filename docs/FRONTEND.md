# Frontend SaaS (Next.js)

## Структура

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard
│   │   ├── create/page.tsx       # Upload flow
│   │   ├── gallery/page.tsx      # Template gallery
│   │   ├── jobs/page.tsx         # Job history
│   │   └── billing/page.tsx      # Subscription
│   ├── api/                     # API routes (BFF)
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── proxy/               # Proxy to backend
│   └── layout.tsx
├── components/
│   ├── VideoUploader.tsx         # Presigned URL upload
│   ├── FaceUploader.tsx
│   ├── JobProgress.tsx           # Polling / WebSocket
│   └── TemplateCard.tsx
└── lib/
    ├── api.ts                   # Backend client
    └── auth.ts
```

---

## Ключевые страницы

### 1. Create Flow
1. Выбор: Template или Upload
2. Upload face (crop/align preview)
3. Upload video (если не template)
4. Create job → redirect to progress
5. Poll GET /jobs/{id}/status каждые 2 сек
6. При completed → show download link

### 2. Progress Polling

```typescript
// Option A: Polling
const pollJob = async (jobId: string) => {
  const res = await fetch(`/api/jobs/${jobId}/status`);
  const data = await res.json();
  if (data.status === 'completed') {
    window.location.href = data.output_url;
  } else {
    setTimeout(() => pollJob(jobId), 2000);
  }
};

// Option B: WebSocket (Pusher/Ably)
channel.bind('job-completed', (data) => {
  if (data.job_id === jobId) showDownload(data.output_url);
});
```

### 3. Auth (NextAuth)
- Credentials provider (email/password)
- OAuth: Google, GitHub
- JWT session, sync с backend

### 4. Billing
- Stripe Checkout для subscription
- Customer portal для manage
- Credits display в header
