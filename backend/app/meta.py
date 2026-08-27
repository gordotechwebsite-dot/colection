"""Etiquetas <meta> renderizadas en el servidor.

Los buscadores y los previews de WhatsApp/Telegram/Facebook no ejecutan
JavaScript, así que el HTML que entrega el servidor ya lleva título,
descripción, canónica, Open Graph y datos estructurados de cada ruta.
"""

import json
import re
from dataclasses import dataclass, field
from xml.sax.saxutils import escape

from sqlalchemy.orm import Session

from . import config, models
from .slugs import slugify

LISTING_PATH = re.compile(r"^anuncio/(\d+)")
# Rutas del router que no describen ubicaciones ni anuncios.
APP_PATHS = {"ingresar", "registro", "publicar", "mi-cuenta", "admin"}
DEFAULT_TITLE = "Redbook · Clasificados globales"
DEFAULT_DESCRIPTION = (
    "Clasificados globales con fotos, video y contacto directo por WhatsApp."
)


@dataclass
class PageMeta:
    title: str = DEFAULT_TITLE
    description: str = DEFAULT_DESCRIPTION
    path: str = "/"
    image: str | None = None
    structured: dict | None = field(default=None)
    status: int = 200


def _shorten(text: str, limit: int = 160) -> str:
    clean = " ".join((text or "").split())
    return clean if len(clean) <= limit else f"{clean[: limit - 1].rstrip()}…"


def _absolute(url: str) -> str:
    return url if url.startswith("http") else f"{config.SITE_URL}{url}"


def _listing_meta(db: Session, listing_id: int) -> PageMeta | None:
    listing = (
        db.query(models.Listing)
        .filter(
            models.Listing.id == listing_id,
            models.Listing.active.is_(True),
            models.Listing.status == models.STATUS_APPROVED,
        )
        .first()
    )
    if listing is None:
        return None

    place = ", ".join(
        part
        for part in (
            listing.zone.name if listing.zone else None,
            listing.city.name if listing.city else None,
            listing.country.name if listing.country else None,
        )
        if part
    )
    cover = next((item for item in listing.media if item.kind == "image"), None)
    image = _absolute(cover.url) if cover else None
    description = _shorten(listing.description or f"Anuncio en {place}")
    path = f"/anuncio/{listing.id}/{slugify(listing.title)}"
    structured = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": listing.title,
        "description": description,
        "url": f"{config.SITE_URL}{path}",
    }
    if image:
        structured["image"] = image
    if place:
        structured["areaServed"] = place
    return PageMeta(
        title=f"{listing.title} | Redbook",
        description=description,
        path=path,
        image=image,
        structured=structured,
    )


def _location_meta(db: Session, parts: list[str], path: str) -> PageMeta | None:
    country = (
        db.query(models.Country).filter(models.Country.slug == parts[0]).first()
    )
    if country is None:
        return None
    names = [country.name]
    city = None
    if len(parts) > 1:
        city = next((item for item in country.cities if item.slug == parts[1]), None)
        if city is None:
            return None
        names.append(city.name)
    if len(parts) > 2 and city is not None:
        zone = next((item for item in city.zones if item.slug == parts[2]), None)
        if zone is None:
            return None
        names.append(zone.name)

    place = ", ".join(reversed(names))
    return PageMeta(
        title=f"Anuncios en {place} | Redbook",
        description=(
            f"Anuncios verificados en {place}. Fotos, video y contacto directo "
            "por WhatsApp."
        ),
        path=path,
    )


def page_meta(db: Session, full_path: str) -> PageMeta:
    """Metadatos de la ruta pedida; cae en los genéricos si no aplica."""
    path = full_path.strip("/")
    if not path:
        return PageMeta()

    listing = LISTING_PATH.match(path)
    if listing:
        found = _listing_meta(db, int(listing.group(1)))
        return found or PageMeta(status=404)

    parts = path.split("/")
    if parts[0] in APP_PATHS:
        return PageMeta()
    if len(parts) <= 3:
        found = _location_meta(db, parts, f"/{path}")
        if found:
            return found
    return PageMeta(status=404)


def _attr(value: str) -> str:
    return escape(value, {'"': "&quot;"})


def render(template: str, meta: PageMeta) -> str:
    url = f"{config.SITE_URL}{meta.path}"
    title = _attr(meta.title)
    description = _attr(meta.description)
    tags = [
        f'<meta name="description" content="{description}" />',
        f'<link rel="canonical" href="{escape(url)}" />',
        '<meta property="og:type" content="website" />',
        '<meta property="og:site_name" content="Redbook" />',
        f'<meta property="og:title" content="{title}" />',
        f'<meta property="og:description" content="{description}" />',
        f'<meta property="og:url" content="{escape(url)}" />',
        '<meta name="twitter:card" content="summary_large_image" />',
    ]
    if meta.image:
        tags.append(f'<meta property="og:image" content="{escape(meta.image)}" />')
    if meta.structured:
        payload = json.dumps(meta.structured, ensure_ascii=False).replace("<", "\\u003c")
        tags.append(f'<script type="application/ld+json">{payload}</script>')

    head = "".join(tags)
    html = re.sub(
        r"<title>.*?</title>",
        f"<title>{escape(meta.title)}</title>{head}",
        template,
        count=1,
        flags=re.DOTALL,
    )
    return html
