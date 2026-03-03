import uuid
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.config import DATA_DIR
from app.storage import get_job_dir, load_status, get_output_path, save_status
from app.tasks import process_video

app = FastAPI(title="AI Video MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_video_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    return ext if ext in (".mp4", ".mov", ".webm", ".avi", ".mkv") else ".mp4"


def get_image_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    return ext if ext in (".png", ".jpg", ".jpeg", ".webp", ".gif") else ".png"


@app.post("/upload")
async def upload(video: UploadFile = File(...), image: UploadFile = File(...)):
    job_id = str(uuid.uuid4())
    job_dir = get_job_dir(job_id)

    video_ext = get_video_extension(video.filename or "video.mp4")
    image_ext = get_image_extension(image.filename or "face.png")

    video_path = job_dir / f"video{video_ext}"
    face_path = job_dir / f"face{image_ext}"

    video_content = await video.read()
    image_content = await image.read()

    with open(video_path, "wb") as f:
        f.write(video_content)
    with open(face_path, "wb") as f:
        f.write(image_content)

    save_status(job_id, "pending")
    process_video.delay(job_id)

    return {"job_id": job_id}


@app.get("/status/{job_id}")
async def status(job_id: str):
    data = load_status(job_id)
    if not data:
        raise HTTPException(status_code=404, detail="Job not found")
    return data


@app.get("/download/{job_id}")
async def download(job_id: str):
    data = load_status(job_id)
    if not data:
        raise HTTPException(status_code=404, detail="Job not found")
    if data["status"] != "done":
        raise HTTPException(status_code=400, detail=f"Job not ready: {data['status']}")

    output_path = get_output_path(job_id)
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Output file not found")

    return FileResponse(
        path=str(output_path),
        filename="output.mp4",
        media_type="video/mp4",
    )


@app.get("/stream/{job_id}")
async def stream(job_id: str):
    data = load_status(job_id)
    if not data:
        raise HTTPException(status_code=404, detail="Job not found")
    if data["status"] != "done":
        raise HTTPException(status_code=400, detail=f"Job not ready: {data['status']}")

    output_path = get_output_path(job_id)
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Output file not found")

    # No filename -> served inline, suitable for <video> tag playback
    return FileResponse(
        path=str(output_path),
        media_type="video/mp4",
    )
