"""Pre-download buffalo_l (face detection) for Docker build. inswapper is downloaded via wget."""
try:
    from insightface.app import FaceAnalysis
    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=0)
    print("Buffalo_l model downloaded successfully")
except Exception as e:
    print(f"Model download skipped: {e}")
