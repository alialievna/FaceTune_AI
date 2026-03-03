import json
import os
from pathlib import Path

from app.config import DATA_DIR


def get_job_dir(job_id: str) -> Path:
    path = Path(DATA_DIR) / "jobs" / job_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def get_status_path(job_id: str) -> Path:
    return Path(DATA_DIR) / "jobs" / job_id / "status.json"


def save_status(job_id: str, status: str, error: str | None = None) -> None:
    path = get_status_path(job_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    data = {"status": status, "error": error}
    with open(path, "w") as f:
        json.dump(data, f)


def load_status(job_id: str) -> dict | None:
    path = get_status_path(job_id)
    if not path.exists():
        return None
    with open(path, "r") as f:
        return json.load(f)


def get_output_path(job_id: str) -> Path:
    return get_job_dir(job_id) / "output.mp4"
