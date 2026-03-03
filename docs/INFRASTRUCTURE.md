# Infrastructure & DevOps

## Docker

### Multi-stage Dockerfile (API)

```dockerfile
# Stage 1: Builder
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY . .
ENV PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### GPU Worker Dockerfile

```dockerfile
FROM nvidia/cuda:12.0-runtime-ubuntu22.04
RUN apt-get update && apt-get install -y python3.11 ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements-gpu.txt .
RUN pip install -r requirements-gpu.txt
COPY . .
CMD ["celery", "-A", "app.workers.inference_worker", "worker", "-Q", "inference", "-c", "1"]
```

---

## Kubernetes

### API Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: faceapp-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: faceapp-api
  template:
    spec:
      containers:
      - name: api
        image: faceapp/api:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: faceapp-secrets
              key: database-url
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: faceapp-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: faceapp-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### GPU Worker (Node Selector)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: faceapp-gpu-worker
spec:
  replicas: 1
  template:
    spec:
      nodeSelector:
        nvidia.com/gpu: "true"
      containers:
      - name: gpu-worker
        image: faceapp/gpu-worker:latest
        resources:
          limits:
            nvidia.com/gpu: 1
          requests:
            memory: "16Gi"
            cpu: "4"
```

### GPU Auto-scaling (Karpenter / Cluster Autoscaler)

```yaml
# Karpenter Provisioner for GPU
apiVersion: karpenter.sh/v1alpha5
kind: Provisioner
metadata:
  name: gpu
spec:
  requirements:
    - key: node.kubernetes.io/instance-type
      operator: In
      values: [g4dn.xlarge, g5.xlarge]
  limits:
    resources:
      nvidia.com/gpu: 20
  ttlSecondsAfterEmpty: 600  # Scale down after 10 min idle
```

---

## CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements.txt
      - run: pytest backend/tests/ -v

  build-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ secrets.REGISTRY }}/faceapp-api:${{ github.sha }}

  deploy-staging:
    needs: build-api
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: azure/k8s-set-context@v3
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG }}
      - run: kubectl set image deployment/faceapp-api api=${{ secrets.REGISTRY }}/faceapp-api:${{ github.sha }} -n staging
```

---

## Environments

| Env | API Replicas | GPU Workers | Database |
|-----|--------------|-------------|----------|
| Staging | 2 | 1 | RDS small |
| Production | 3-10 | 1-20 | RDS multi-AZ |

---

## Canary Deployment

```yaml
# 10% traffic to new version
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: faceapp-api
spec:
  hosts:
  - api.faceapp.com
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: faceapp-api
        subset: v2
      weight: 100
  - route:
    - destination:
        host: faceapp-api
        subset: v1
      weight: 90
    - destination:
        host: faceapp-api
        subset: v2
      weight: 10
```

---

## Cost Estimation (AWS)

### Per 1000 renders/day (30s video each)

| Resource | Spec | Qty | $/hr | $/day |
|----------|------|-----|------|-------|
| g4dn.xlarge (GPU) | T4 16GB | 2 | $0.526 | ~$25 |
| API (t3.medium) | 2 vCPU | 3 | $0.042 | ~$3 |
| RDS (db.t3.medium) | 2 vCPU | 1 | $0.068 | ~$2 |
| Redis (cache.t3.micro) | - | 1 | $0.017 | ~$0.5 |
| S3 + CloudFront | 1TB transfer | - | - | ~$100 |
| **Total** | | | | **~$130/day** |

### Unit Economics (30s video)

- **GPU time**: ~2 min @ $0.01/min = $0.02
- **Storage (30 days)**: ~$0.001
- **Bandwidth**: ~$0.01
- **Total cost**: **~$0.03/video**
- **Price (pay-per-render)**: $0.99 → **97% margin**
- **Subscription**: $9.99/mo, 30 videos → $0.33/video → **90% margin**

---

## Cost Reduction Strategies

1. **Spot instances** для GPU — до 70% экономии (с retry logic)
2. **Scale to zero** — GPU workers 0 при idle
3. **Batch optimization** — batch 8 вместо 4 → 2x throughput
4. **ONNX + TensorRT** — 2x faster inference
5. **Regional deployment** — дешёвые регионы (us-east-1)
6. **Reserved instances** — 1-year commit → 40% discount
