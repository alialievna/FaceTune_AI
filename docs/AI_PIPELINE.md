# AI Face Swap Pipeline — Production Technical Spec

## Pipeline Overview

```
┌──────────┐   ┌──────────────┐   ┌─────────────┐   ┌──────────────┐   ┌─────────────┐
│ 1.Upload │──▶│ 2.Face       │──▶│ 3.Frame     │──▶│ 4.Face Swap  │──▶│ 5.Encode    │
│ S3 direct│   │ Detection    │   │ Extraction  │   │ Per-frame    │   │ + Watermark │
└──────────┘   └──────────────┘   └─────────────┘   └──────────────┘   └─────────────┘
```

---

## Stage 1: Upload

- **Presigned S3 URL** — клиент загружает напрямую в S3 (не через API)
- **Webhook/Event** — S3 trigger → Lambda/Worker → создание Job
- **Validation**: format (mp4, mov), size (<500MB), duration (<120s)
- **Virus scan**: ClamAV (опционально)

---

## Stage 2: Face Detection

**Модель: RetinaFace или InsightFace (SCRFD)**

```python
# RetinaFace: 640x640 input, ~5ms inference на T4
# InsightFace SCRFD: быстрее, точнее для alignment
```

- Input: source face photo (user upload)
- Output: bbox, landmarks (5-point или 68-point)
- **Face quality check**: blur detection, occlusion, multiple faces
- **Consent**: сохраняем embedding для similarity check (abuse prevention)

---

## Stage 3: Face Embedding & Alignment

- **ArcFace/InsightFace** — 512-dim embedding для source face
- **Alignment**: affine transform по landmarks → 112x112 crop
- **Multi-face**: если в видео несколько лиц — track по embedding similarity
- **Storage**: embedding в Redis (session) или DB для moderation

---

## Stage 4: Frame Extraction

```bash
ffmpeg -i input.mp4 -vf "fps=30" -q:v 2 frame_%06d.png
```

- **FPS**: сохраняем оригинальный FPS (24/30/60)
- **Resolution**: max 1080p для inference (downscale если 4K)
- **Chunking**: для видео >60s — разбиваем на chunks по 300 frames
- **Temp storage**: NVMe/SSD на GPU node (не NFS!)

---

## Stage 5: Multi-Face Tracking

- **ByteTrack/DeepSORT** — трекинг лиц между кадрами
- **Re-identification**: cosine similarity embedding при occlusions
- **Output**: `{frame_id: [(face_id, bbox, landmarks)]}`

---

## Stage 6: Face Swap Per Frame

**Модели: SimSwap / FaceFusion / InsightFace swap**

| Модель | Quality | Speed (T4) | VRAM |
|--------|---------|------------|------|
| SimSwap | ★★★★ | ~50ms/frame | 4GB |
| FaceFusion | ★★★★★ | ~80ms/frame | 6GB |
| Custom ONNX | ★★★★ | ~30ms/frame | 3GB |

**Pipeline per frame:**
1. Crop source face (aligned)
2. Run swap model (source_face, target_face_crop)
3. Paste result back (poisson blending / alpha)
4. Color correction (histogram matching)
5. Temporal smoothing (optional: 3-frame moving average)

---

## Stage 7: Color Correction

- **Histogram matching** — source face → target lighting
- **Reinhard color transfer** — быстрее, хороший результат
- **Per-region**: только face region, не весь кадр

---

## Stage 8: Temporal Smoothing

- **3-5 frame moving average** на landmarks/alpha
- Снижает flickering при быстрых движениях
- Trade-off: slight blur при очень быстром движении

---

## Stage 9: Video Encoding

```bash
# GPU encoding (NVENC)
ffmpeg -y -framerate 30 -i frame_%06d.png -c:v h264_nvenc -preset p4 -b:v 5M output.mp4
```

- **h264_nvenc** или **hevc_nvenc** — 5-10x быстрее CPU
- **Preset**: p4 (balance), p1 (fastest)
- **Bitrate**: 5 Mbps для 1080p

---

## Stage 10: Watermarking

- **Free tier**: полупрозрачный логотип, corner
- **Paid**: без watermark или subtle
- **FFmpeg overlay**: `-vf "movie=watermark.png [wm]; [in][wm] overlay=10:10 [out]"`

---

## Stage 11: Upload to Storage

- **Multipart upload** для больших файлов
- **Metadata**: job_id, user_id, duration, resolution
- **Lifecycle**: outputs — 30 days (free) / 1 year (paid)

---

## Stage 12: Notify User

- **Webhook** → API → update Job status
- **WebSocket** push или **polling** GET /job/{id}
- **Email** (опционально) для длинных задач

---

## CUDA Optimization

```python
# 1. ONNX Runtime GPU
session = ort.InferenceSession(
    "swap_model.onnx",
    providers=["CUDAExecutionProvider", "CPUExecutionProvider"]
)

# 2. TensorRT (если нужна max скорость)
# Convert ONNX → TensorRT engine, ~2x speedup

# 3. Mixed precision FP16
# Большинство face swap моделей поддерживают FP16

# 4. Batch processing
# Batch 4-8 frames если VRAM позволяет (24GB → batch 8)
```

---

## Batch Processing

```
Single frame: 50ms × 900 frames (30s video) = 45s
Batch 4:      120ms × 225 batches = 27s (1.7x speedup)
Batch 8:      200ms × 113 batches = 23s (2x speedup)
```

**VRAM budget (T4 16GB):**
- Model: 4GB
- Batch 4 frames 1080p: ~6GB
- Overhead: 2GB
- **Total: ~12GB** → batch 4 safe

---

## ONNX/TensorRT Optimization

```bash
# ONNX simplify
python -m onnxsim model.onnx model_sim.onnx

# TensorRT (NVIDIA)
trtexec --onnx=model.onnx --saveEngine=model.engine --fp16
```

---

## VRAM Management

- **Model loading**: lazy load при первом job
- **Unload**: после 30 min idle — освободить VRAM
- **OOM handling**: retry с batch_size/2, fallback CPU (медленно)

---

## Chunking для длинных видео

```
Video 5 min (9000 frames @ 30fps):
├── Chunk 0: frames 0-2999    → output_0.mp4
├── Chunk 1: frames 3000-5999 → output_1.mp4
└── Chunk 2: frames 6000-8999 → output_2.mp4
         ↓
    ffmpeg concat → final.mp4
```

- Chunk size: 3000 frames (100s) — баланс memory/throughput
- Parallel chunks на разных GPU workers (если доступно)
