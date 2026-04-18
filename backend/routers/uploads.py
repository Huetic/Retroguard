from pathlib import Path
from datetime import datetime
import uuid

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
}
MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB
CHUNK_SIZE = 1024 * 1024  # 1 MB

router = APIRouter(prefix="/api/uploads", tags=["Uploads"])


class UploadResponse(BaseModel):
    image_path: str  # public URL; goes straight into Measurement.image_path
    filename: str
    size_bytes: int
    content_type: str


@router.post("", response_model=UploadResponse, status_code=201)
async def upload_image(file: UploadFile = File(...)):
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported content-type: {content_type or 'unknown'}",
        )

    original_suffix = Path(file.filename or "").suffix.lower()
    if original_suffix not in {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}:
        original_suffix = ".jpg"

    stored_name = (
        f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_"
        f"{uuid.uuid4().hex[:10]}{original_suffix}"
    )
    dest = UPLOAD_DIR / stored_name

    size = 0
    try:
        with dest.open("wb") as out:
            while True:
                chunk = await file.read(CHUNK_SIZE)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit",
                    )
                out.write(chunk)
    except HTTPException:
        dest.unlink(missing_ok=True)
        raise
    except Exception:
        dest.unlink(missing_ok=True)
        raise

    return UploadResponse(
        image_path=f"/uploads/{stored_name}",
        filename=stored_name,
        size_bytes=size,
        content_type=content_type,
    )
