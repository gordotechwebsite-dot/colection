import hmac
import os

from fastapi import Header, HTTPException

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "redbook-admin")


def require_admin(x_admin_token: str = Header(default="")) -> None:
    if not hmac.compare_digest(x_admin_token, ADMIN_TOKEN):
        raise HTTPException(status_code=401, detail="Token de administrador inválido")
