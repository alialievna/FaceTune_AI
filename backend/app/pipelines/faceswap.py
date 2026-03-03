"""
Face swap pipeline using InsightFace + InSwapper
Sequential processing (Celery worker = daemon, cannot spawn processes)
"""
import subprocess
from pathlib import Path

import cv2
import insightface
import onnxruntime as ort
from insightface.app import FaceAnalysis

TARGET_FPS = 24


def _get_execution_providers() -> list[str]:
    """
    Prefer GPU providers when available, but always fall back to CPU.

    This is safe on CPU-only environments (like Docker on macOS) and will
    automatically use CUDA / other accelerators on a suitable Linux GPU host
    where onnxruntime is built with those providers.
    """
    available = set(ort.get_available_providers())
    preferred_order = [
        "CUDAExecutionProvider",
        "ROCMExecutionProvider",
        "CoreMLExecutionProvider",
        "DmlExecutionProvider",
        "CPUExecutionProvider",
    ]
    providers = [p for p in preferred_order if p in available]
    return providers or ["CPUExecutionProvider"]


def run_faceswap(video_path: str, face_path: str, output_path: str) -> None:
    assert insightface.__version__ >= "0.7"

    providers = _get_execution_providers()

    job_dir = Path(video_path).parent
    frames_dir = job_dir / "frames"
    frames_dir.mkdir(exist_ok=True)
    out_frames_dir = job_dir / "out_frames"
    out_frames_dir.mkdir(exist_ok=True)

    # Extract frames: original resolution, 24fps
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", video_path,
            "-vf", f"fps={TARGET_FPS}",
            "-q:v", "2",
            str(frames_dir / "frame_%06d.png"),
        ],
        check=True,
        capture_output=True,
    )
    frame_files = sorted(frames_dir.glob("frame_*.png"))
    if not frame_files:
        raise ValueError("No frames extracted from video")

    # Init models
    app = FaceAnalysis(name="buffalo_l", providers=providers)
    app.prepare(ctx_id=0, det_size=(640, 640))

    model_path = Path.home() / ".insightface" / "models" / "inswapper_128.onnx"
    from insightface.model_zoo.inswapper import INSwapper

    if model_path.exists():
        session = ort.InferenceSession(
            str(model_path),
            providers=providers,
        )
        swapper = INSwapper(model_file=str(model_path), session=session)
    else:
        swapper = insightface.model_zoo.get_model(
            "inswapper_128.onnx", download=True, download_zip=False
        )

    source_img = cv2.imread(face_path)
    if source_img is None:
        raise ValueError("Could not read face image")
    source_faces = app.get(source_img)
    if not source_faces:
        raise ValueError("No face detected in source image")
    source_face = source_faces[0]

    # Sequential (no multiprocessing - Celery worker is daemon)
    for fp in frame_files:
        frame = cv2.imread(str(fp))
        if frame is None:
            continue
        target_faces = app.get(frame)
        if not target_faces:
            cv2.imwrite(str(out_frames_dir / fp.name), frame)
            continue
        target_face = max(
            target_faces,
            key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
        )
        try:
            result = swapper.get(frame, target_face, source_face, paste_back=True)
            cv2.imwrite(str(out_frames_dir / fp.name), result)
        except Exception:
            cv2.imwrite(str(out_frames_dir / fp.name), frame)

    # Encode: ultrafast for speed, CRF 21 for quality
    subprocess.run(
        [
            "ffmpeg", "-y", "-framerate", str(TARGET_FPS),
            "-i", str(out_frames_dir / "frame_%06d.png"),
            "-i", video_path,
            "-map", "0:v", "-map", "1:a?",
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "21", "-threads", "0",
            "-pix_fmt", "yuv420p",
            "-c:a", "copy",
            "-shortest",
            "-movflags", "+faststart",
            output_path,
        ],
        check=True,
        capture_output=True,
    )

    for f in frame_files:
        f.unlink(missing_ok=True)
    for f in out_frames_dir.glob("*.png"):
        f.unlink(missing_ok=True)
    frames_dir.rmdir()
    out_frames_dir.rmdir()
