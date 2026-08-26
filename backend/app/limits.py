"""Límites de uso por IP para frenar abuso y métricas infladas.

Los contadores viven en memoria del proceso: alcanzan para cortar spam y
recargas automáticas sin agregar dependencias ni tocar la base de datos.
"""

import time
from collections import defaultdict, deque

from fastapi import Request

# Ventanas por acción: (intentos permitidos, segundos de la ventana).
REGISTER = (10, 3600)
LOGIN = (10, 300)
UPLOAD = (60, 3600)
# Una vista y un clic por anuncio, por IP, cada diez minutos.
COUNT_ONCE = (1, 600)
# Anuncios que un mismo vendedor puede enviar por día.
LISTINGS_PER_DAY = 10


class RateLimiter:
    """Ventana deslizante en memoria."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def _fresh(self, key: str, window: int) -> deque[float]:
        now = time.monotonic()
        hits = self._hits[key]
        while hits and now - hits[0] > window:
            hits.popleft()
        return hits

    def allow(self, key: str, limit: int, window: int) -> bool:
        """Cuenta el intento y dice si queda dentro del límite."""
        hits = self._fresh(key, window)
        if len(hits) >= limit:
            return False
        hits.append(time.monotonic())
        return True

    def blocked(self, key: str, limit: int, window: int) -> bool:
        """Revisa el límite sin contar el intento."""
        return len(self._fresh(key, window)) >= limit

    def hit(self, key: str, window: int) -> None:
        self._fresh(key, window).append(time.monotonic())

    def reset(self) -> None:
        self._hits.clear()


limiter = RateLimiter()


def client_ip(request: Request) -> str:
    """IP real del visitante; nginx la reenvía en X-Forwarded-For."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "desconocida"


def allow(request: Request, action: str, rule: tuple[int, int]) -> bool:
    limit, window = rule
    return limiter.allow(f"{action}:{client_ip(request)}", limit, window)


def blocked(request: Request, action: str, rule: tuple[int, int]) -> bool:
    limit, window = rule
    return limiter.blocked(f"{action}:{client_ip(request)}", limit, window)


def record_failure(request: Request, action: str, rule: tuple[int, int]) -> None:
    limiter.hit(f"{action}:{client_ip(request)}", rule[1])
