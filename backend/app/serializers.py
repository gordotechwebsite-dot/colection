from urllib.parse import quote

from . import models, ranking
from .models import Listing, Seller

STATUS_LABELS = {
    models.STATUS_PENDING: "En revisión",
    models.STATUS_APPROVED: "Publicado",
    models.STATUS_REJECTED: "Rechazado",
}

CHANNEL_LABELS = {
    models.CHANNEL_WHATSAPP: "WhatsApp",
    models.CHANNEL_INSTAGRAM: "Instagram",
}


def contact_message(listing: Listing) -> str:
    return f'Hola, vi tu anuncio "{listing.title}" en Redbook y me interesa. ¿Está disponible?'


def seller_contact_url(seller: Seller, listing: Listing | None = None) -> str:
    """Enlace directo a la conversación con el vendedor en su canal elegido."""
    if seller.contact_channel == models.CHANNEL_INSTAGRAM and seller.instagram:
        # ig.me/m abre el chat directo de Instagram; no admite texto prellenado.
        return f"https://ig.me/m/{seller.instagram}"
    number = (seller.whatsapp or "").lstrip("+")
    if not number:
        return ""
    url = f"https://wa.me/{number}"
    if listing is not None:
        url = f"{url}?text={quote(contact_message(listing))}"
    return url


def only_digits(value: str | None) -> str:
    return "".join(ch for ch in (value or "") if ch.isdigit())


def telegram_url(seller: Seller) -> str:
    """Chat de Telegram: usuario configurado o, si no hay, el número de WhatsApp."""
    handle = (seller.telegram or "").strip().lstrip("@")
    if handle and not only_digits(handle):
        return f"https://t.me/{handle}"
    number = only_digits(handle) or only_digits(seller.whatsapp)
    return f"https://t.me/+{number}" if number else ""


def call_url(seller: Seller) -> str:
    """Llamada telefónica al número configurado o al de WhatsApp."""
    number = only_digits(seller.phone) or only_digits(seller.whatsapp)
    return f"tel:+{number}" if number else ""


def listing_out(listing: Listing) -> dict:
    plan = ranking.effective_plan(listing)
    channel = listing.seller.contact_channel
    return {
        "id": listing.id,
        "title": listing.title,
        "display_name": listing.display_name or "",
        "verified": bool(listing.verified),
        "description": listing.description,
        "price": listing.price,
        "currency": listing.currency,
        "seller": listing.seller,
        "category_id": listing.category_id,
        "category": listing.category,
        "country": listing.country,
        "city": listing.city,
        "zone": listing.zone,
        "media": listing.media,
        "specs": listing.specs,
        "filters": [
            {
                "filter_id": value.filter_id,
                "filter_slug": value.filter.slug,
                "filter_name": value.filter.name,
                "option_id": value.option_id,
                "option_slug": value.option.slug,
                "option_name": value.option.name,
            }
            for value in listing.filter_values
        ],
        "plan": listing.plan,
        "effective_plan": plan,
        "plan_label": ranking.PLAN_LABELS[plan],
        "plan_until": listing.plan_until,
        "bumped_at": listing.bumped_at,
        "score": ranking.score(listing),
        "views": listing.views,
        "contact_clicks": listing.contact_clicks,
        "active": listing.active,
        "status": listing.status,
        "status_label": STATUS_LABELS.get(listing.status, listing.status),
        "rejection_reason": listing.rejection_reason,
        "reviewed_at": listing.reviewed_at,
        "created_at": listing.created_at,
        "contact_channel": channel,
        "contact_label": CHANNEL_LABELS.get(channel, channel),
        "contact_url": seller_contact_url(listing.seller, listing),
        "telegram_url": telegram_url(listing.seller),
        "call_url": call_url(listing.seller),
    }
