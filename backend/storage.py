"""
storage.py — single abstraction for file persistence.

Today only FilesystemStorage is implemented. To swap to S3/MinIO later,
implement the Storage Protocol and replace the module-level `storage` singleton.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from io import IOBase
from pathlib import Path
from typing import Optional, Protocol, runtime_checkable

from fastapi import UploadFile


@runtime_checkable
class Storage(Protocol):
    """Protocol that every storage backend must satisfy."""

    def save(self, file: UploadFile, subdir: Optional[str] = None) -> str:
        """
        Persist the upload and return a server-relative stored_path,
        e.g. ``"uploads/20260418_a1b2c3d4.jpg"`` or
        ``"uploads/videos/20260418_a1b2c3d4.mp4"``.
        """
        ...

    def url_for(self, stored_path: str) -> str:
        """Return the URL a browser/frontend can GET, e.g. ``"/uploads/..."``."""
        ...

    def open(self, stored_path: str) -> IOBase:
        """Return an open binary stream for reading the stored file."""
        ...

    def absolute_path(self, stored_path: str) -> Path:
        """
        Return the absolute filesystem path for backends that need it
        (e.g. cv2.imread, which cannot accept a stream).
        """
        ...


class FilesystemStorage:
    """
    Stores files under *upload_root* on the local filesystem.

    Directory layout::

        <upload_root>/
            <optional-subdir>/
                YYYYMMDDHHMMSS_<8hex><ext>

    # TODO: replace with an S3Storage / MinIOStorage class to go cloud-native.
    """

    CHUNK_SIZE = 1024 * 1024  # 1 MB

    def __init__(self, upload_root: Path) -> None:
        self._root = upload_root
        self._root.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _generate_name(self, file: UploadFile, ext_fallback: str = ".bin") -> str:
        original_ext = Path(file.filename or "").suffix.lower() or ext_fallback
        ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        hex8 = uuid.uuid4().hex[:8]
        return f"{ts}_{hex8}{original_ext}"

    def _target_dir(self, subdir: Optional[str]) -> Path:
        if subdir:
            d = self._root / subdir
            d.mkdir(parents=True, exist_ok=True)
            return d
        return self._root

    # ------------------------------------------------------------------
    # Protocol implementation
    # ------------------------------------------------------------------

    def save(self, file: UploadFile, subdir: Optional[str] = None) -> str:
        """
        Write upload to disk in chunks and return a server-relative stored_path
        like ``"uploads/20260418_a1b2c3d4.jpg"``.
        """
        name = self._generate_name(file)
        dest_dir = self._target_dir(subdir)
        dest = dest_dir / name

        with dest.open("wb") as out:
            raw = file.file
            while True:
                chunk = raw.read(self.CHUNK_SIZE)
                if not chunk:
                    break
                out.write(chunk)

        # Return path relative to the *parent* of upload_root so it looks like
        # "uploads/<name>" (mirrors the existing image_path convention).
        return str(dest.relative_to(self._root.parent))

    def url_for(self, stored_path: str) -> str:
        """Return a root-relative URL, e.g. ``"/uploads/20260418_a1b2c3d4.jpg"``."""
        return f"/{stored_path}"

    def open(self, stored_path: str) -> IOBase:
        """Open the stored file for reading (binary mode)."""
        return self.absolute_path(stored_path).open("rb")

    def absolute_path(self, stored_path: str) -> Path:
        """
        Reconstruct the absolute filesystem path from a stored_path.

        ``stored_path`` is always relative to ``self._root.parent``,
        so ``absolute_path("uploads/foo.jpg")`` → ``<root>/foo.jpg``.
        """
        return self._root.parent / stored_path


# ---------------------------------------------------------------------------
# Module-level singleton — import this everywhere.
# ---------------------------------------------------------------------------
storage = FilesystemStorage(Path(__file__).resolve().parent / "uploads")
