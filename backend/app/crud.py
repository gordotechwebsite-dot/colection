from fastapi import HTTPException
from sqlalchemy.orm import Session

from . import models, queries, schemas, security


def get_listing_or_404(
    db: Session, listing_id: int, *, only_public: bool = False
) -> models.Listing:
    query = queries.base_query(db).filter(models.Listing.id == listing_id)
    if only_public:
        query = query.filter(
            models.Listing.active.is_(True),
            models.Listing.status == models.STATUS_APPROVED,
        )
    listing = query.first()
    if not listing:
        raise HTTPException(status_code=404, detail="Publicación no encontrada")
    return listing


def build_public_id(seller_id: int) -> str:
    return f"RB-{seller_id:06d}"


def create_seller(db: Session, payload: schemas.SellerRegister) -> models.Seller:
    email = payload.email.lower()
    if db.query(models.Seller).filter(models.Seller.email == email).first():
        raise HTTPException(status_code=409, detail="Ya existe una cuenta con ese correo")
    check_location(db, payload.country_id, payload.city_id)

    seller = models.Seller(
        public_id="",
        name=payload.name,
        email=email,
        password_hash=security.hash_password(payload.password),
        seller_type=payload.seller_type,
        contact_channel=payload.contact_channel,
        whatsapp=payload.whatsapp,
        instagram=payload.instagram,
        country_id=payload.country_id,
        city_id=payload.city_id,
    )
    db.add(seller)
    db.flush()
    seller.public_id = build_public_id(seller.id)
    db.commit()
    db.refresh(seller)
    return seller


def update_seller(
    db: Session, seller: models.Seller, payload: schemas.SellerUpdate
) -> models.Seller:
    data = payload.model_dump(exclude_unset=True)
    if "country_id" in data or "city_id" in data:
        check_location(
            db,
            data.get("country_id", seller.country_id),
            data.get("city_id", seller.city_id),
        )
    for field, value in data.items():
        setattr(seller, field, value)

    channel = seller.contact_channel
    if channel == models.CHANNEL_WHATSAPP and not seller.whatsapp:
        raise HTTPException(
            status_code=400,
            detail="Escribe tu número de WhatsApp con indicativo del país",
        )
    if channel == models.CHANNEL_INSTAGRAM and not seller.instagram:
        raise HTTPException(status_code=400, detail="Escribe tu usuario de Instagram")
    db.commit()
    db.refresh(seller)
    return seller


def check_location(
    db: Session,
    country_id: int | None,
    city_id: int | None,
    zone_id: int | None = None,
) -> None:
    if country_id is not None and not db.get(models.Country, country_id):
        raise HTTPException(status_code=400, detail="País inválido")
    if city_id is not None:
        city = db.get(models.City, city_id)
        if not city or (country_id is not None and city.country_id != country_id):
            raise HTTPException(
                status_code=400, detail="La ciudad no pertenece al país seleccionado"
            )
    if zone_id is not None:
        zone = db.get(models.Zone, zone_id)
        if not zone or (city_id is not None and zone.city_id != city_id):
            raise HTTPException(
                status_code=400, detail="La zona no pertenece a la ciudad seleccionada"
            )


def create_listing(
    db: Session,
    payload: schemas.ListingCreate,
    seller: models.Seller,
    *,
    status: str = models.STATUS_PENDING,
) -> models.Listing:
    category = db.get(models.Category, payload.category_id)
    if not category:
        raise HTTPException(status_code=400, detail="Categoría inválida")
    if not db.get(models.Country, payload.country_id):
        raise HTTPException(status_code=400, detail="País inválido")
    check_location(db, payload.country_id, payload.city_id, payload.zone_id)

    listing = models.Listing(
        title=payload.title,
        display_name=payload.display_name.strip(),
        description=payload.description,
        price=payload.price,
        currency=payload.currency,
        country_id=payload.country_id,
        city_id=payload.city_id,
        zone_id=payload.zone_id,
        seller_id=seller.id,
        category_id=category.id,
        status=status,
        reviewed_at=models.utcnow() if status == models.STATUS_APPROVED else None,
    )
    apply_media(listing, payload.media)
    apply_specs(listing, payload.specs)
    apply_filter_values(db, listing, payload.filter_values)

    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing


def apply_media(listing: models.Listing, items: list[schemas.MediaIn]) -> None:
    listing.media.clear()
    for position, item in enumerate(items):
        listing.media.append(models.Media(kind=item.kind, url=item.url, position=position))


def apply_specs(listing: models.Listing, specs: list[schemas.SpecIn]) -> None:
    listing.specs.clear()
    for position, spec in enumerate(specs):
        listing.specs.append(
            models.ListingSpec(
                label=spec.label.strip(), value=spec.value.strip(), position=position
            )
        )


def apply_filter_values(
    db: Session, listing: models.Listing, filter_values: dict[int, int]
) -> None:
    listing.filter_values.clear()
    # Sin este flush, SQLAlchemy inserta las filas nuevas antes de borrar las
    # viejas y choca con el índice único (listing_id, filter_id) al reeditar.
    db.flush()
    for filter_id, option_id in filter_values.items():
        option = db.get(models.FilterOption, option_id)
        if not option or option.filter_id != filter_id:
            raise HTTPException(status_code=400, detail="Opción de filtro inválida")
        listing.filter_values.append(
            models.ListingFilterValue(filter_id=filter_id, option_id=option_id)
        )


BANNER_SLOTS = ("home_top", "home_middle")

DEFAULT_BANNERS = {
    "home_top": {
        "title": "Compra y vende en Redbook",
        "subtitle": "Clasificados globales con contacto directo al vendedor.",
    },
    "home_middle": {"title": "", "subtitle": "", "active": False},
}


def get_banner(db: Session, slot: str = "home_top") -> models.Banner:
    """Devuelve el banner de un espacio de la portada, creándolo la primera vez."""
    if slot not in BANNER_SLOTS:
        raise HTTPException(status_code=404, detail="Banner inexistente")
    banner = db.query(models.Banner).filter(models.Banner.slot == slot).first()
    if not banner:
        banner = models.Banner(slot=slot, **DEFAULT_BANNERS[slot])
        db.add(banner)
        db.commit()
        db.refresh(banner)
    return banner


def list_banners(db: Session) -> list[models.Banner]:
    return [get_banner(db, slot) for slot in BANNER_SLOTS]


def update_banner(
    db: Session, payload: schemas.BannerIn, slot: str = "home_top"
) -> models.Banner:
    banner = get_banner(db, slot)
    banner.title = payload.title
    banner.subtitle = payload.subtitle
    banner.image_url = payload.image_url
    banner.link_url = payload.link_url
    banner.link_label = payload.link_label
    banner.active = payload.active
    db.commit()
    db.refresh(banner)
    return banner
