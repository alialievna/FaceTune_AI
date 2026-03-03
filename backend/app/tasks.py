from app.worker import celery_app
from app.storage import get_job_dir, save_status, get_output_path
from app.pipelines.faceswap import run_faceswap


@celery_app.task
def process_video(job_id: str) -> str:
    import subprocess

    job_dir = get_job_dir(job_id)
    output_path = get_output_path(job_id)

    video_file = next(job_dir.glob("video.*"), None)
    face_file = next(job_dir.glob("face.*"), None)

    if not video_file or not face_file:
        save_status(job_id, "failed", "Missing video or face file")
        return "failed"

    try:
        save_status(job_id, "processing")
        run_faceswap(
            str(video_file),
            str(face_file),
            str(output_path),
        )
        save_status(job_id, "done")
        return "done"
    except subprocess.CalledProcessError as e:
        err_msg = str(e)
        if e.stderr:
            err_msg = f"{err_msg}\n{e.stderr}"
        save_status(job_id, "failed", err_msg)
        return "failed"
    except Exception as e:
        save_status(job_id, "failed", str(e))
        return "failed"
