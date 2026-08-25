import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile

from .config import (
    IMAGE_CONTENT_TYPES,
    MAX_IMAGE_BYTES,
    MAX_VIDEO_BYTES,
    MEDIA_DIR,
    MEDIA_URL,
    VIDEO_CONTENT_TYPES,
)

CHUNK_SIZE = 1024 * 1024


def ensure_media_dir() -> Path:
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    return MEDIA_DIR


def classify(upload: UploadFile) -> tuple[str, str, int]:
    """Devuelve (kind, extensión, tamaño máximo) según el content type."""
    content_type = (upload.content_type or "").lower()
    if content_type in IMAGE_CONTENT_TYPES:
        return "image", IMAGE_CONTENT_TYPES[content_type], MAX_IMAGE_BYTES
    if content_type in VIDEO_CONTENT_TYPES:
        return "video", VIDEO_CONTENT_TYPES[content_type], MAX_VIDEO_BYTES
    raise HTTPException(
        status_code=400,
        detail=f"Tipo de archivo no permitido: {upload.content_type or 'desconocido'}",
    )


def save_upload(upload: UploadFile) -> tuple[str, str]:
    """Guarda el archivo en disco y devuelve (kind, url pública)."""
    kind, extension, max_bytes = classify(upload)
    ensure_media_dir()
    name = f"{secrets.token_hex(16)}{extension}"
    destination = MEDIA_DIR / name

    written = 0
    try:
        with destination.open("wb") as handle:
            while chunk := upload.file.read(CHUNK_SIZE):
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=(f"El archivo supera el límite de {max_bytes // (1024 * 1024)} MB."),
                    )
                handle.write(chunk)
    except HTTPException:
        destination.unlink(missing_ok=True)
        raise
    finally:
        upload.file.close()

    return kind, f"{MEDIA_URL}/{name}"
