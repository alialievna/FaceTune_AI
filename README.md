# FaceTune_AI — Local AI Video Face Swap

FaceTune_AI is a local, SaaS‑style **AI video face swap** app with a modern dashboard UI and a FastAPI + Celery backend.  
Everything runs locally via Docker: no external AI APIs, all data stays on your machine.

---

## Features

- **Upload video + face image** via a clean dashboard interface.
- **Face swap in video** using InsightFace + InSwapper.
- **Background processing** with Celery workers and Redis queue.
- **My Videos page**:
  - inline playback of processed videos in a `<video>` player,
  - one‑click **Download** button for the result.
- **Job status tracking**: `pending → processing → done / failed`.
- **Rich docs** in `docs/` (architecture, AI pipeline, infra, monetization, etc.).

---

## Tech Stack

- **Backend**
  - Python 3.11, FastAPI
  - Celery + Redis
  - InsightFace (`buffalo_l`) + `inswapper_128.onnx`
  - ffmpeg
- **Frontend**
  - Next.js (App Router, React 18)
  - Tailwind CSS, shadcn‑style UI components
  - Framer Motion
- **Infra**
  - Docker + docker‑compose

---

## Quick Start (Docker)

```bash
git clone https://github.com/alialievna/FaceTune_AI.git
cd FaceTune_AI

# Make sure Docker Desktop is running
docker compose up --build
```

After startup:

- **Frontend**: `http://localhost:3001`
- **API**: `http://localhost:8002`

### Services in `docker-compose.yml`

- `web` — Next.js frontend.
- `api` — FastAPI application.
- `worker` — Celery worker processing jobs.
- `redis` — message broker for Celery.

Video files and intermediates are stored in `data/jobs/<job_id>/` and are **ignored by git** via `.gitignore`.

---

## Usage

### 1. Create a Video

1. Open `http://localhost:3001/create`.
2. Upload:
   - an input video (`.mp4` / `.mov` / `.webm` / …),
   - a face image (`.jpg` / `.png` / …).
3. Click **Process Video**.  
   The job status switches to `processing`.

### 2. Track Status

- On **Create Video** you see the latest job’s status.
- On **My Videos** (`/videos`):
  - list of all local jobs,
  - status badges: `pending` / `processing` / `done` / `failed`,
  - **Check Status** button that refreshes status from the backend.

### 3. Preview & Download Result

On **My Videos**, for jobs with status `done`:

- The card shows an inline **video player** loading from  
  `GET /stream/{job_id}`.
- The **Download** button saves `output.mp4` via  
  `GET /download/{job_id}`.

---

## Project Structure

```text
FaceTune_AI/
  backend/           # FastAPI + Celery + InsightFace
    app/
      main.py        # API (upload/status/download/stream)
      tasks.py       # Celery task: process_video
      pipelines/
        faceswap.py  # face swap pipeline (InsightFace + InSwapper)
        overlay.py   # legacy ffmpeg overlay baseline
      storage.py     # helpers for data/jobs
      worker.py      # Celery app configuration
    Dockerfile
    requirements.txt

  frontend/          # Next.js 14, App Router
    app/
      (dashboard)/create/page.jsx    # upload & processing page
      (dashboard)/videos/page.jsx    # list, preview, download
      (dashboard)/dashboard/page.jsx
      (dashboard)/settings/page.jsx
    components/      # layout, buttons, cards, dropzone, etc.
    lib/
      storage.js     # local storage for jobs metadata
      utils.js       # API_URL and helpers
    Dockerfile

  data/              # local job data (ignored by git)
    jobs/<job_id>/
      video.mp4
      face.jpg
      output.mp4
      status.json

  docs/              # architecture, AI pipeline, infra, monetization
  docker-compose.yml # docker stack (api, worker, web, redis)
  .gitignore
```

---

## Performance & GPU Notes

- By default the pipeline runs on **CPU** — good for macOS / typical dev machines.
- The code automatically selects ONNX Runtime GPU providers (`CUDAExecutionProvider`, etc.)  
  when the backend runs on a Linux server with an NVIDIA GPU and `onnxruntime-gpu` installed.
- For a production GPU setup:
  - use a CUDA base image in the backend Dockerfile,
  - run containers with `--gpus all`.

---

## Roadmap Ideas

- Authentication and billing (Stripe / Lemon Squeezy).
- Quotas and rate limits per user / workspace.
- Batch video processing.
- Advanced analytics dashboard (render time, conversions, usage).
- Cloud GPU mode with an external worker pool.

---

## License

MIT (or another license of your choice).