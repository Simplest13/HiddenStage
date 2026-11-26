import io
import os
import requests
import cloudinary
import cloudinary.uploader
import cloudinary.utils
from django.core.files.base import File
from django.core.files.storage import Storage

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".bmp",
    ".ico",
    ".tiff",
}

VIDEO_EXTENSIONS = {
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
    ".webm",
    ".flv",
    ".wmv",
    ".m4v",
}


class DynamicCloudinaryStorage(Storage):
    """
    Production-grade Cloudinary storage for Django.
    Directly supports images, videos, and raw files (PDF, DOCX, etc.).
    Preserves extensions, uses HTTPS, and streams content transparently.
    """

    def get_resource_type(self, name: str) -> str:
        ext = os.path.splitext(name)[1].lower()
        if ext in IMAGE_EXTENSIONS:
            return "image"
        if ext in VIDEO_EXTENSIONS:
            return "video"
        return "raw"

    def _clean_name(self, name: str) -> str:
        clean = name.replace("\\", "/").strip("/")
        return clean

    def _public_id_for_upload(self, name: str, resource_type: str) -> str:
        clean = self._clean_name(name)
        if resource_type in {"image", "video"}:
            base, _ = os.path.splitext(clean)
            return base
        return clean

    def _save(self, name: str, content) -> str:
        clean_name = self._clean_name(name)
        resource_type = self.get_resource_type(clean_name)
        public_id = self._public_id_for_upload(clean_name, resource_type)

        if hasattr(content, "seek"):
            content.seek(0)

        options = {
            "public_id": public_id,
            "resource_type": resource_type,
            "overwrite": True,
            "invalidate": True,
        }

        # Upload to Cloudinary
        response = cloudinary.uploader.upload(content, **options)

        # Store normalized name with original extension
        return clean_name

    def url(self, name: str) -> str:
        if not name:
            return ""
        clean_name = self._clean_name(name)
        resource_type = self.get_resource_type(clean_name)
        ext = os.path.splitext(clean_name)[1].lower().lstrip(".")

        if resource_type in {"image", "video"}:
            base, _ = os.path.splitext(clean_name)
            url, _ = cloudinary.utils.cloudinary_url(
                base,
                resource_type=resource_type,
                format=ext if ext else None,
                secure=True,
                force_version=False,
            )
        else:
            url, _ = cloudinary.utils.cloudinary_url(
                clean_name,
                resource_type=resource_type,
                secure=True,
                force_version=False,
            )
        return url

    def delete(self, name: str) -> bool:
        if not name:
            return False
        clean_name = self._clean_name(name)
        resource_type = self.get_resource_type(clean_name)
        public_id = self._public_id_for_upload(clean_name, resource_type)
        try:
            res = cloudinary.uploader.destroy(
                public_id,
                resource_type=resource_type,
                invalidate=True,
            )
            return res.get("result") in {"ok", "not found"}
        except Exception:
            return False

    def exists(self, name: str) -> bool:
        if not name:
            return False
        url = self.url(name)
        if not url:
            return False
        try:
            r = requests.head(url, timeout=5)
            return r.status_code == 200
        except Exception:
            return False

    def size(self, name: str) -> int:
        url = self.url(name)
        if not url:
            return 0
        try:
            r = requests.head(url, timeout=5)
            if r.status_code == 200 and "Content-Length" in r.headers:
                return int(r.headers["Content-Length"])
        except Exception:
            pass
        return 0

    def _open(self, name: str, mode: str = "rb") -> File:
        url = self.url(name)
        r = requests.get(url, stream=True, timeout=15)
        if r.status_code != 200:
            raise FileNotFoundError(f"Cloudinary resource '{name}' not found at {url}")
        content = io.BytesIO(r.content)
        return File(content, name=name)
