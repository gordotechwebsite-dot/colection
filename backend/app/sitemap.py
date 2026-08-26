from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy.orm import Session

from . import config, models
from .database import get_db
from .slugs import slugify

router = APIRouter(include_in_schema=False)


def _entries(db: Session) -> list[tuple[str, str]]:
    """Rutas públicas: portada, países, ciudades, zonas y anuncios aprobados."""
    entries: list[tuple[str, str]] = [("/", "daily")]

    countries = db.query(models.Country).filter(models.Country.active.is_(True)).all()
    for country in countries:
        entries.append((f"/{country.slug}", "daily"))
        cities = [city for city in country.cities if city.active]
        for city in cities:
            entries.append((f"/{country.slug}/{city.slug}", "daily"))
            for zone in city.zones:
                if zone.active:
                    entries.append(
                        (f"/{country.slug}/{city.slug}/{zone.slug}", "daily")
                    )

    listings = (
        db.query(models.Listing)
        .filter(
            models.Listing.active.is_(True),
            models.Listing.status == models.STATUS_APPROVED,
        )
        .all()
    )
    for listing in listings:
        entries.append((f"/anuncio/{listing.id}/{slugify(listing.title)}", "weekly"))
    return entries


@router.get("/sitemap.xml")
def sitemap(db: Session = Depends(get_db)) -> Response:
    urls = "".join(
        "<url>"
        f"<loc>{escape(config.SITE_URL + path)}</loc>"
        f"<changefreq>{freq}</changefreq>"
        "</url>"
        for path, freq in _entries(db)
    )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"{urls}</urlset>"
    )
    return Response(content=xml, media_type="application/xml")


@router.get("/robots.txt", response_class=PlainTextResponse)
def robots() -> str:
    return (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /admin\n"
        "Disallow: /api/\n"
        f"Sitemap: {config.SITE_URL}/sitemap.xml\n"
    )
