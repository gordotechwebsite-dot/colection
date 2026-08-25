import re
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from . import crud, models, queries, ranking, schemas, security, serializers
from .auth import require_admin
from .database import get_db
from .slugs import slugify

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])

INTERNAL_SELLER_NAME = "Redbook (interno)"
INTERNAL_EMAIL_DOMAIN = "redbook.internal"


def internal_seller(
    db: Session,
    channel: str | None,
    contact: str | None,
    telegram: str | None = None,
    phone: str | None = None,
) -> models.Seller:
    """Vendedor interno para los anuncios que crea el administrador.

    Se reutiliza uno por contacto, así todos los anuncios con el mismo número o
    usuario comparten el mismo ID interno.
    """
    channel = channel or models.CHANNEL_WHATSAPP
    if channel not in (models.CHANNEL_WHATSAPP, models.CHANNEL_INSTAGRAM):
        raise HTTPException(status_code=400, detail="Canal de contacto inválido")
    value = (contact or "").strip().lstrip("@")
    key = re.sub(r"[^a-z0-9]", "", value.lower())
    local_part = f"interno-{channel}-{key}" if key else "interno"
    email = f"{local_part}@{INTERNAL_EMAIL_DOMAIN}"

    seller = db.query(models.Seller).filter(models.Seller.email == email).first()
    if seller:
        apply_extra_contacts(seller, telegram, phone)
        return seller

    seller = models.Seller(
        public_id="",
        name=INTERNAL_SELLER_NAME,
        email=email,
        password_hash=security.hash_password(secrets.token_urlsafe(24)),
        contact_channel=channel,
        whatsapp=value if channel == models.CHANNEL_WHATSAPP else None,
        instagram=value if channel == models.CHANNEL_INSTAGRAM else None,
    )
    apply_extra_contacts(seller, telegram, phone)
    db.add(seller)
    db.flush()
    seller.public_id = crud.build_public_id(seller.id)
    return seller


def apply_extra_contacts(
    seller: models.Seller, telegram: str | None, phone: str | None
) -> None:
    """Telegram y teléfono de llamada; vacíos vuelven a usar el de WhatsApp."""
    if telegram is not None:
        seller.telegram = telegram.strip() or None
    if phone is not None:
        seller.phone = phone.strip() or None


class AdminListingCreate(schemas.ListingCreate):
    # El vendedor es interno: si no se indica, el anuncio queda bajo un usuario
    # de Redbook creado a partir del contacto.
    seller_id: int | None = None
    contact_channel: str | None = None
    contact_value: str | None = None
    telegram: str | None = None
    phone: str | None = None
    plan: str = ranking.PLAN_FREE
    plan_days: int = Field(default=30, ge=1, le=365)
    active: bool = True
    # Solo el admin decide si el nombre lleva el chulo de verificado.
    verified: bool = False
    # El admin publica directo, sin pasar por la cola de verificación.
    status: str = models.STATUS_APPROVED


class AdminListingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=120)
    display_name: str | None = Field(default=None, max_length=60)
    description: str | None = Field(default=None, min_length=20, max_length=5000)
    price: float | None = Field(default=None, ge=0)
    currency: str | None = None
    category_id: int | None = None
    country_id: int | None = None
    city_id: int | None = None
    zone_id: int | None = None
    seller_id: int | None = None
    contact_channel: str | None = None
    contact_value: str | None = None
    telegram: str | None = None
    phone: str | None = None
    active: bool | None = None
    verified: bool | None = None
    plan: str | None = None
    plan_days: int | None = Field(default=None, ge=1, le=365)
    filter_values: dict[int, int] | None = None
    specs: list[schemas.SpecIn] | None = None
    media: list[schemas.MediaIn] | None = None


class AdminStats(BaseModel):
    listings: int
    active_listings: int
    pending_listings: int
    sellers: int
    countries: int
    cities: int
    categories: int
    filters: int
    views: int
    contact_clicks: int
    by_plan: dict[str, int]


def delete_with_listings(
    db: Session,
    entity: models.Country | models.City | models.Zone | models.Category,
    label: str,
    force: bool,
) -> None:
    """Borra un tipo o ubicación; con force también borra sus anuncios."""
    listings = entity.listings
    if listings and not force:
        raise HTTPException(
            status_code=409,
            detail=(
                f"{label} tiene {len(listings)} anuncio(s), incluidos los rechazados "
                "o inactivos. Confirma para borrarlos también."
            ),
        )
    for listing in list(listings):
        db.delete(listing)
    db.delete(entity)
    db.commit()


@router.get("/session")
def check_session():
    return {"ok": True}


@router.get("/stats", response_model=AdminStats)
def stats(db: Session = Depends(get_db)):
    listings = db.query(models.Listing).all()
    by_plan = {plan: 0 for plan in ranking.PLANS}
    for listing in listings:
        by_plan[ranking.effective_plan(listing)] += 1
    return AdminStats(
        listings=len(listings),
        active_listings=sum(1 for item in listings if item.active),
        pending_listings=sum(1 for item in listings if item.status == models.STATUS_PENDING),
        sellers=db.query(models.Seller).count(),
        countries=db.query(models.Country).count(),
        cities=db.query(models.City).count(),
        categories=db.query(models.Category).count(),
        filters=db.query(models.Filter).count(),
        views=sum(item.views for item in listings),
        contact_clicks=sum(item.contact_clicks for item in listings),
        by_plan=by_plan,
    )


# --- Categorías ---------------------------------------------------------


@router.get("/categories", response_model=list[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).order_by(models.Category.name).all()


@router.post("/categories", response_model=schemas.CategoryOut, status_code=201)
def create_category(payload: schemas.CategoryIn, db: Session = Depends(get_db)):
    slug = slugify(payload.name)
    if db.query(models.Category).filter(models.Category.slug == slug).first():
        raise HTTPException(status_code=409, detail="Ya existe una categoría con ese nombre")
    category = models.Category(
        slug=slug, name=payload.name, icon=payload.icon, active=payload.active
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.patch("/categories/{category_id}", response_model=schemas.CategoryOut)
def update_category(category_id: int, payload: schemas.CategoryIn, db: Session = Depends(get_db)):
    category = db.get(models.Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    category.name = payload.name
    category.slug = slugify(payload.name)
    category.icon = payload.icon
    category.active = payload.active
    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}", status_code=204)
def delete_category(category_id: int, force: bool = False, db: Session = Depends(get_db)):
    category = db.get(models.Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    delete_with_listings(db, category, "El tipo", force)


# --- Países y ciudades --------------------------------------------------


@router.get("/countries", response_model=list[schemas.CountryOut])
def list_countries(db: Session = Depends(get_db)):
    return (
        db.query(models.Country)
        .options(joinedload(models.Country.cities).joinedload(models.City.zones))
        .order_by(models.Country.name)
        .all()
    )


@router.post("/countries", response_model=schemas.CountryOut, status_code=201)
def create_country(payload: schemas.CountryIn, db: Session = Depends(get_db)):
    slug = slugify(payload.name)
    if db.query(models.Country).filter(models.Country.slug == slug).first():
        raise HTTPException(status_code=409, detail="Ese país ya está registrado")
    country = models.Country(
        slug=slug,
        name=payload.name,
        code=payload.code,
        currency=payload.currency,
        active=payload.active,
    )
    db.add(country)
    db.commit()
    db.refresh(country)
    return country


@router.patch("/countries/{country_id}", response_model=schemas.CountryOut)
def update_country(country_id: int, payload: schemas.CountryIn, db: Session = Depends(get_db)):
    country = db.get(models.Country, country_id)
    if not country:
        raise HTTPException(status_code=404, detail="País no encontrado")
    country.name = payload.name
    country.slug = slugify(payload.name)
    country.code = payload.code
    country.currency = payload.currency
    country.active = payload.active
    db.commit()
    db.refresh(country)
    return country


@router.delete("/countries/{country_id}", status_code=204)
def delete_country(country_id: int, force: bool = False, db: Session = Depends(get_db)):
    country = db.get(models.Country, country_id)
    if not country:
        raise HTTPException(status_code=404, detail="País no encontrado")
    delete_with_listings(db, country, "El país", force)


@router.post("/countries/{country_id}/cities", response_model=schemas.CityOut, status_code=201)
def create_city(country_id: int, payload: schemas.CityIn, db: Session = Depends(get_db)):
    country = db.get(models.Country, country_id)
    if not country:
        raise HTTPException(status_code=404, detail="País no encontrado")
    slug = slugify(payload.name)
    exists = (
        db.query(models.City)
        .filter(models.City.country_id == country_id, models.City.slug == slug)
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="Esa ciudad ya existe en el país")
    city = models.City(country_id=country_id, slug=slug, name=payload.name, active=payload.active)
    db.add(city)
    db.commit()
    db.refresh(city)
    return city


@router.patch("/cities/{city_id}", response_model=schemas.CityOut)
def update_city(city_id: int, payload: schemas.CityIn, db: Session = Depends(get_db)):
    city = db.get(models.City, city_id)
    if not city:
        raise HTTPException(status_code=404, detail="Ciudad no encontrada")
    city.name = payload.name
    city.slug = slugify(payload.name)
    city.active = payload.active
    db.commit()
    db.refresh(city)
    return city


@router.delete("/cities/{city_id}", status_code=204)
def delete_city(city_id: int, force: bool = False, db: Session = Depends(get_db)):
    city = db.get(models.City, city_id)
    if not city:
        raise HTTPException(status_code=404, detail="Ciudad no encontrada")
    delete_with_listings(db, city, "La ciudad", force)


# --- Zonas --------------------------------------------------------------


@router.post("/cities/{city_id}/zones", response_model=schemas.ZoneOut, status_code=201)
def create_zone(city_id: int, payload: schemas.ZoneIn, db: Session = Depends(get_db)):
    city = db.get(models.City, city_id)
    if not city:
        raise HTTPException(status_code=404, detail="Ciudad no encontrada")
    slug = slugify(payload.name)
    exists = (
        db.query(models.Zone)
        .filter(models.Zone.city_id == city_id, models.Zone.slug == slug)
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="Esa zona ya existe en la ciudad")
    zone = models.Zone(city_id=city_id, slug=slug, name=payload.name, active=payload.active)
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone


@router.patch("/zones/{zone_id}", response_model=schemas.ZoneOut)
def update_zone(zone_id: int, payload: schemas.ZoneIn, db: Session = Depends(get_db)):
    zone = db.get(models.Zone, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    zone.name = payload.name
    zone.slug = slugify(payload.name)
    zone.active = payload.active
    db.commit()
    db.refresh(zone)
    return zone


@router.delete("/zones/{zone_id}", status_code=204)
def delete_zone(zone_id: int, force: bool = False, db: Session = Depends(get_db)):
    zone = db.get(models.Zone, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    delete_with_listings(db, zone, "La zona", force)


# --- Filtros ------------------------------------------------------------


@router.get("/filters", response_model=list[schemas.FilterOut])
def list_filters(db: Session = Depends(get_db)):
    return (
        db.query(models.Filter)
        .options(joinedload(models.Filter.options))
        .order_by(models.Filter.position, models.Filter.name)
        .all()
    )


def _apply_options(db: Session, target: models.Filter, options) -> None:
    target.options.clear()
    db.flush()
    seen = set()
    for position, option in enumerate(options):
        slug = slugify(option.name)
        if slug in seen:
            raise HTTPException(status_code=400, detail=f"Opción repetida: {option.name}")
        seen.add(slug)
        target.options.append(models.FilterOption(slug=slug, name=option.name, position=position))


@router.post("/filters", response_model=schemas.FilterOut, status_code=201)
def create_filter(payload: schemas.FilterIn, db: Session = Depends(get_db)):
    slug = slugify(payload.name)
    if db.query(models.Filter).filter(models.Filter.slug == slug).first():
        raise HTTPException(status_code=409, detail="Ya existe un filtro con ese nombre")
    if payload.category_id is not None and not db.get(models.Category, payload.category_id):
        raise HTTPException(status_code=400, detail="Categoría inválida")
    target = models.Filter(
        slug=slug,
        name=payload.name,
        category_id=payload.category_id,
        position=payload.position,
        active=payload.active,
    )
    _apply_options(db, target, payload.options)
    db.add(target)
    db.commit()
    db.refresh(target)
    return target


@router.patch("/filters/{filter_id}", response_model=schemas.FilterOut)
def update_filter(filter_id: int, payload: schemas.FilterIn, db: Session = Depends(get_db)):
    target = db.get(models.Filter, filter_id)
    if not target:
        raise HTTPException(status_code=404, detail="Filtro no encontrado")
    target.name = payload.name
    target.slug = slugify(payload.name)
    target.category_id = payload.category_id
    target.position = payload.position
    target.active = payload.active
    db.query(models.ListingFilterValue).filter(
        models.ListingFilterValue.filter_id == filter_id
    ).delete()
    _apply_options(db, target, payload.options)
    db.commit()
    db.refresh(target)
    return target


@router.delete("/filters/{filter_id}", status_code=204)
def delete_filter(filter_id: int, db: Session = Depends(get_db)):
    target = db.get(models.Filter, filter_id)
    if not target:
        raise HTTPException(status_code=404, detail="Filtro no encontrado")
    db.query(models.ListingFilterValue).filter(
        models.ListingFilterValue.filter_id == filter_id
    ).delete()
    db.delete(target)
    db.commit()


# --- Publicaciones ------------------------------------------------------


@router.get("/listings", response_model=schemas.ListingPage)
def list_listings(
    db: Session = Depends(get_db),
    category: str | None = None,
    country: str | None = None,
    city: str | None = None,
    zone: str | None = None,
    q: str | None = None,
    plan: str | None = None,
    active: bool | None = None,
    status: str | None = Query(default=None, pattern="^(pending|approved|rejected)$"),
    filter: list[str] = Query(default=[]),
    sort: str = Query("relevance", pattern="^(relevance|recent|price_asc|price_desc|views)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    query = queries.apply_filters(
        queries.base_query(db),
        category=category,
        country=country,
        city=city,
        zone=zone,
        q=q,
        plan=plan,
        active=active,
        status=status,
        filter_specs=filter,
    )
    listings = queries.sort_listings(query.all(), sort)
    page = listings[offset : offset + limit]
    return schemas.ListingPage(
        items=[serializers.listing_out(item) for item in page],
        total=len(listings),
        limit=limit,
        offset=offset,
    )


@router.post("/listings", response_model=schemas.ListingOut, status_code=201)
def create_listing(payload: AdminListingCreate, db: Session = Depends(get_db)):
    if payload.plan not in ranking.PLANS:
        raise HTTPException(status_code=400, detail="Plan inválido")
    if payload.seller_id is not None:
        seller = db.get(models.Seller, payload.seller_id)
        if not seller:
            raise HTTPException(status_code=400, detail="Vendedor inválido")
    else:
        seller = internal_seller(
            db,
            payload.contact_channel,
            payload.contact_value,
            payload.telegram,
            payload.phone,
        )
    listing = crud.create_listing(db, payload, seller, status=payload.status)
    listing.active = payload.active
    listing.verified = payload.verified
    if payload.plan != ranking.PLAN_FREE:
        listing.plan = payload.plan
        listing.plan_until = ranking.plan_expiry(payload.plan_days)
    db.commit()
    db.refresh(listing)
    return serializers.listing_out(listing)


@router.patch("/listings/{listing_id}", response_model=schemas.ListingOut)
def update_listing(listing_id: int, payload: AdminListingUpdate, db: Session = Depends(get_db)):
    listing = crud.get_listing_or_404(db, listing_id)
    data = payload.model_dump(exclude_unset=True)

    plan = data.pop("plan", None)
    plan_days = data.pop("plan_days", None)
    filter_values = data.pop("filter_values", None)
    contact_channel = data.pop("contact_channel", None)
    contact_value = data.pop("contact_value", None)
    telegram = data.pop("telegram", None)
    phone = data.pop("phone", None)
    data.pop("specs", None)
    data.pop("media", None)

    if contact_channel is not None or contact_value is not None:
        data["seller_id"] = internal_seller(
            db,
            contact_channel or listing.seller.contact_channel,
            contact_value,
            telegram,
            phone,
        ).id
    else:
        apply_extra_contacts(listing.seller, telegram, phone)
    if data.get("seller_id") is not None and not db.get(models.Seller, data["seller_id"]):
        raise HTTPException(status_code=400, detail="Vendedor inválido")
    if "category_id" in data and not db.get(models.Category, data["category_id"]):
        raise HTTPException(status_code=400, detail="Categoría inválida")
    if "country_id" in data and not db.get(models.Country, data["country_id"]):
        raise HTTPException(status_code=400, detail="País inválido")
    if data.get("city_id") is not None:
        city = db.get(models.City, data["city_id"])
        country_id = data.get("country_id", listing.country_id)
        if not city or city.country_id != country_id:
            raise HTTPException(
                status_code=400, detail="La ciudad no pertenece al país seleccionado"
            )
    if data.get("zone_id") is not None:
        zone = db.get(models.Zone, data["zone_id"])
        city_id = data.get("city_id", listing.city_id)
        if not zone or zone.city_id != city_id:
            raise HTTPException(
                status_code=400, detail="La zona no pertenece a la ciudad seleccionada"
            )

    if data.get("display_name") is not None:
        data["display_name"] = data["display_name"].strip()

    for key, value in data.items():
        setattr(listing, key, value)

    if plan is not None:
        if plan not in ranking.PLANS:
            raise HTTPException(status_code=400, detail="Plan inválido")
        listing.plan = plan
        listing.plan_until = (
            None if plan == ranking.PLAN_FREE else ranking.plan_expiry(plan_days or 30)
        )
    if filter_values is not None:
        crud.apply_filter_values(db, listing, filter_values)
    if payload.specs is not None:
        crud.apply_specs(listing, payload.specs)
    if payload.media is not None:
        crud.apply_media(listing, payload.media)

    db.commit()
    db.refresh(listing)
    return serializers.listing_out(listing)


@router.post("/listings/{listing_id}/review", response_model=schemas.ListingOut)
def review_listing(listing_id: int, payload: schemas.ReviewIn, db: Session = Depends(get_db)):
    """Aprueba o rechaza un anuncio enviado a verificación."""
    listing = crud.get_listing_or_404(db, listing_id)
    listing.status = payload.status
    listing.reviewed_at = models.utcnow()
    if payload.status == models.STATUS_REJECTED:
        listing.rejection_reason = payload.rejection_reason
    else:
        listing.rejection_reason = None
        listing.bumped_at = models.utcnow()
    db.commit()
    db.refresh(listing)
    return serializers.listing_out(listing)


@router.get("/sellers", response_model=list[schemas.SellerAccount])
def list_sellers(db: Session = Depends(get_db)):
    return db.query(models.Seller).order_by(models.Seller.created_at.desc()).all()


@router.delete("/listings/{listing_id}", status_code=204)
def delete_listing(listing_id: int, db: Session = Depends(get_db)):
    listing = crud.get_listing_or_404(db, listing_id)
    db.delete(listing)
    db.commit()


@router.get("/banner", response_model=schemas.BannerOut)
def get_banner(slot: str = "home_top", db: Session = Depends(get_db)):
    return crud.get_banner(db, slot)


@router.put("/banner", response_model=schemas.BannerOut)
def update_banner(
    payload: schemas.BannerIn,
    slot: str = "home_top",
    db: Session = Depends(get_db),
):
    return crud.update_banner(db, payload, slot)
