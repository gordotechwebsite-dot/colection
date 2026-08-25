import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'redbook.db'}")

MEDIA_DIR = Path(os.getenv("MEDIA_DIR", BASE_DIR / "media"))
MEDIA_URL = "/media"

MIN_IMAGES = int(os.getenv("MIN_IMAGES", "3"))
MAX_IMAGES = int(os.getenv("MAX_IMAGES", "10"))
MAX_VIDEOS = int(os.getenv("MAX_VIDEOS", "1"))

MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_BYTES", str(8 * 1024 * 1024)))
MAX_VIDEO_BYTES = int(os.getenv("MAX_VIDEO_BYTES", str(64 * 1024 * 1024)))

IMAGE_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
VIDEO_CONTENT_TYPES = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
}
