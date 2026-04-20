from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from storage import storage

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
}
MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB

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

    # Size check: read into a buffer first so we can enforce the limit before
    # writing. We read the full body once then wrap it back for storage.save.
    import io
    buf = io.BytesIO()
    size = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        size += len(chunk)
        if size > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit",
            )
        buf.write(chunk)
    buf.seek(0)

    # Swap the underlying file object so storage.save reads from our buffer.
    file.file = buf  # type: ignore[assignment]
    # Preserve the validated extension in the filename hint.
    file.filename = (file.filename or "upload") if original_suffix in Path(file.filename or "").suffix.lower() else f"upload{original_suffix}"

    stored_path = storage.save(file)
    stored_name = Path(stored_path).name

    return UploadResponse(
        image_path=storage.url_for(stored_path),
        filename=stored_name,
        size_bytes=size,
        content_type=content_type,
    )
