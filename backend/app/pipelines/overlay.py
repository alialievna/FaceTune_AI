import subprocess
from pathlib import Path


def run_overlay(video_path: str, face_path: str, output_path: str) -> None:
    job_dir = Path(video_path).parent
    scaled_img = str(job_dir / "face_scaled.png")

    # Step 1: Scale image to PNG (avoids format issues)
    r1 = subprocess.run(
        [
            "ffmpeg", "-y", "-nostdin", "-i", face_path,
            "-vf", "scale=200:200:force_original_aspect_ratio=decrease",
            scaled_img,
        ],
        capture_output=True,
        text=True,
    )
    if r1.returncode != 0:
        raise subprocess.CalledProcessError(
            r1.returncode, r1.args, r1.stdout, r1.stderr
        )

    # Step 2: Overlay on video
    r2 = subprocess.run(
        [
            "ffmpeg", "-y", "-nostdin",
            "-i", video_path,
            "-i", scaled_img,
            "-filter_complex", "overlay=W-w-20:H-h-20",
            "-c:a", "copy",
            output_path,
        ],
        capture_output=True,
        text=True,
    )
    if r2.returncode != 0:
        raise subprocess.CalledProcessError(
            r2.returncode, r2.args, r2.stdout, r2.stderr
        )
