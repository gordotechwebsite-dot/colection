"""Sistema de posicionamiento de publicaciones.

El puesto de una publicación en los listados se calcula con un score:

    score = peso_del_plan + frescura + interacción

- **peso_del_plan**: `top` > `destacado` > `gratis`. Solo cuenta mientras el plan
  esté vigente (`plan_until`); al vencer, la publicación vuelve al plan gratis.
- **frescura**: decae exponencialmente desde `bumped_at`, así que renovar
  ("bump") una publicación la vuelve a subir sin cambiar de plan.
- **interacción**: vistas y clics al botón de WhatsApp, con techo para que no
  dominen el orden.
"""

import math
from datetime import datetime, timedelta, timezone

PLAN_FREE = "free"
PLAN_FEATURED = "featured"
PLAN_TOP = "top"

PLANS = (PLAN_FREE, PLAN_FEATURED, PLAN_TOP)

PLAN_WEIGHTS = {PLAN_FREE: 0.0, PLAN_FEATURED: 150.0, PLAN_TOP: 300.0}
PLAN_LABELS = {PLAN_FREE: "Gratis", PLAN_FEATURED: "Destacado", PLAN_TOP: "Top"}

FRESHNESS_MAX = 60.0
FRESHNESS_HALF_LIFE_HOURS = 48.0
ENGAGEMENT_MAX = 40.0


def as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def effective_plan(listing, now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    if listing.plan == PLAN_FREE:
        return PLAN_FREE
    until = as_utc(listing.plan_until)
    if until is not None and until <= now:
        return PLAN_FREE
    return listing.plan


def freshness(bumped_at: datetime | None, now: datetime | None = None) -> float:
    now = now or datetime.now(timezone.utc)
    reference = as_utc(bumped_at) or now
    hours = max((now - reference).total_seconds() / 3600.0, 0.0)
    return FRESHNESS_MAX * math.exp(-hours / FRESHNESS_HALF_LIFE_HOURS)


def engagement(views: int, contact_clicks: int) -> float:
    return min(ENGAGEMENT_MAX, views * 0.4 + contact_clicks * 2.0)


def score(listing, now: datetime | None = None) -> float:
    now = now or datetime.now(timezone.utc)
    total = (
        PLAN_WEIGHTS[effective_plan(listing, now)]
        + freshness(listing.bumped_at, now)
        + engagement(listing.views, listing.contact_clicks)
    )
    return round(total, 2)


def plan_expiry(days: int, now: datetime | None = None) -> datetime:
    now = now or datetime.now(timezone.utc)
    return now + timedelta(days=days)
