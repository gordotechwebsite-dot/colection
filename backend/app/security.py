"""Hash de contraseñas y tokens de sesión firmados (solo stdlib)."""

import base64
import hashlib
import hmac
import json
import os
import secrets
import time

SECRET_KEY = os.getenv("SECRET_KEY", "redbook-dev-secret")
TOKEN_TTL_SECONDS = int(os.getenv("TOKEN_TTL_SECONDS", str(60 * 60 * 24 * 30)))

PBKDF2_ITERATIONS = 200_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations, salt_hex, digest_hex = encoded.split("$")
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt_hex), int(iterations)
    )
    return hmac.compare_digest(digest.hex(), digest_hex)


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def create_token(seller_id: int) -> str:
    payload = {"sub": seller_id, "exp": int(time.time()) + TOKEN_TTL_SECONDS}
    body = _b64encode(json.dumps(payload, separators=(",", ":")).encode())
    signature = hmac.new(SECRET_KEY.encode(), body.encode(), hashlib.sha256).digest()
    return f"{body}.{_b64encode(signature)}"


def read_token(token: str) -> int | None:
    """Devuelve el id del vendedor si el token es válido y vigente."""
    try:
        body, signature = token.split(".")
    except ValueError:
        return None
    expected = hmac.new(SECRET_KEY.encode(), body.encode(), hashlib.sha256).digest()
    if not hmac.compare_digest(_b64decode(signature), expected):
        return None
    try:
        payload = json.loads(_b64decode(body))
    except (ValueError, json.JSONDecodeError):
        return None
    if int(payload.get("exp", 0)) < time.time():
        return None
    return int(payload["sub"])
