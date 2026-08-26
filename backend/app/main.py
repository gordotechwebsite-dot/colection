from fastapi import Depends, FastAPI, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from . import config, crud, media, models, queries, ranking, schemas, serializers
from .admin import router as admin_router
from .database import Base, engine, ensure_schema, get_db
from .deps import current_seller
from .seed import seed
from .sellers import router as sellers_router
from .sitemap import router as sitemap_router

Base.metadata.create_all(bind=engine)
ensure_schema()
seed()

app = FastAPI(title="Redbook API", description="Clasificados globales")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

media.ensure_media_dir()
app.mount(config.MEDIA_URL, StaticFiles(directory=config.MEDIA_DIR), name="media")
app.include_router(admin_router)
app.include_router(sellers_router)
app.include_router(sitemap_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/config", response_model=schemas.MediaLimits)
def get_config():
    return schemas.MediaLimits(
        min_images=config.MIN_IMAGES,
        max_images=config.MAX_IMAGES,
        max_videos=config.MAX_VIDEOS,
        max_image_mb=config.MAX_IMAGE_BYTES // (1024 * 1024),
        max_video_mb=config.MAX_VIDEO_BYTES // (1024 * 1024),
    )


@app.get("/api/banner", response_model=schemas.BannerOut)
def get_banner(slot: str = "home_top", db: Session = Depends(get_db)):
    return crud.get_banner(db, slot)


@app.get("/api/banners", response_model=list[schemas.BannerOut])
def list_banners(db: Session = Depends(get_db)):
    return crud.list_banners(db)


@app.get("/api/categories", response_model=list[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return (
        db.query(models.Category)
        .filter(models.Category.active.is_(True))
        .order_by(models.Category.name)
        .all()
    )


@app.get("/api/countries", response_model=list[schemas.CountryOut])
def list_countries(db: Session = Depends(get_db)):
    countries = (
        db.query(models.Country)
        .options(joinedload(models.Country.cities).joinedload(models.City.zones))
        .filter(models.Country.active.is_(True))
        .order_by(models.Country.name)
        .all()
    )
    return [
        schemas.CountryOut(
            id=country.id,
            slug=country.slug,
            name=country.name,
            code=country.code,
            currency=country.currency,
            active=country.active,
            cities=[
                schemas.CityOut(
                    id=city.id,
                    slug=city.slug,
                    name=city.name,
                    country_id=city.country_id,
                    active=city.active,
                    zones=[
                        schemas.ZoneOut.model_validate(zone) for zone in city.zones if zone.active
                    ],
                )
                for city in country.cities
                if city.active
            ],
        )
        for country in countries
    ]


@app.get("/api/filters", response_model=list[schemas.FilterOut])
def list_filters(category: str | None = None, db: Session = Depends(get_db)):
    query = (
        db.query(models.Filter)
        .options(joinedload(models.Filter.options))
        .filter(models.Filter.active.is_(True))
    )
    if category:
        found = db.query(models.Category).filter(models.Category.slug == category).first()
        if not found:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")
        query = query.filter(
            or_(
                models.Filter.category_id.is_(None),
                models.Filter.category_id == found.id,
            )
        )
    return query.order_by(models.Filter.position, models.Filter.name).all()


@app.get("/api/listings", response_model=schemas.ListingPage)
def list_listings(
    db: Session = Depends(get_db),
    category: str | None = None,
    country: str | None = None,
    city: str | None = None,
    zone: str | None = None,
    q: str | None = None,
    plan: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    filter: list[str] = Query(default=[]),
    sort: str = Query("relevance", pattern="^(relevance|recent|price_asc|price_desc|views)$"),
    limit: int = Query(24, ge=1, le=100),
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
        min_price=min_price,
        max_price=max_price,
        status=models.STATUS_APPROVED,
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


@app.get("/api/listings/{listing_id}", response_model=schemas.ListingOut)
def get_listing(listing_id: int, db: Session = Depends(get_db)):
    listing = crud.get_listing_or_404(db, listing_id, only_public=True)
    listing.views += 1
    db.commit()
    db.refresh(listing)
    return serializers.listing_out(listing)


@app.post("/api/uploads", response_model=list[schemas.UploadedMedia])
def upload_media(files: list[UploadFile]):
    if not files:
        raise HTTPException(status_code=400, detail="No se recibió ningún archivo")
    uploaded = []
    for item in files:
        kind, url = media.save_upload(item)
        uploaded.append(
            schemas.UploadedMedia(
                kind=kind, url=url, filename=item.filename or url.rsplit("/", 1)[-1]
            )
        )
    return uploaded


@app.post("/api/listings", response_model=schemas.ListingSubmitted, status_code=201)
def create_listing(
    payload: schemas.ListingCreate,
    seller: models.Seller = Depends(current_seller),
    db: Session = Depends(get_db),
):
    """El anuncio queda en verificación (1 a 3 días) antes de publicarse."""
    listing = crud.create_listing(db, payload, seller)
    return schemas.ListingSubmitted(listing=serializers.listing_out(listing))


@app.post("/api/listings/{listing_id}/promote", response_model=schemas.ListingOut)
def promote_listing(
    listing_id: int,
    payload: schemas.PromoteIn,
    seller: models.Seller = Depends(current_seller),
    db: Session = Depends(get_db),
):
    listing = crud.get_listing_or_404(db, listing_id)
    if listing.seller_id != seller.id:
        raise HTTPException(status_code=403, detail="Este anuncio no es tuyo")
    listing.plan = payload.plan
    listing.plan_until = ranking.plan_expiry(payload.days)
    listing.bumped_at = models.utcnow()
    db.commit()
    db.refresh(listing)
    return serializers.listing_out(listing)


@app.post("/api/listings/{listing_id}/bump", response_model=schemas.ListingOut)
def bump_listing(
    listing_id: int,
    seller: models.Seller = Depends(current_seller),
    db: Session = Depends(get_db),
):
    listing = crud.get_listing_or_404(db, listing_id)
    if listing.seller_id != seller.id:
        raise HTTPException(status_code=403, detail="Este anuncio no es tuyo")
    listing.bumped_at = models.utcnow()
    db.commit()
    db.refresh(listing)
    return serializers.listing_out(listing)


@app.post("/api/listings/{listing_id}/contact", response_model=schemas.ListingOut)
def register_contact(listing_id: int, db: Session = Depends(get_db)):
    listing = crud.get_listing_or_404(db, listing_id, only_public=True)
    listing.contact_clicks += 1
    db.commit()
    db.refresh(listing)
    return serializers.listing_out(listing)


# Si el frontend está compilado, se sirve desde la misma URL que la API.
if config.FRONTEND_DIST.is_dir():
    app.mount(
        "/assets",
        StaticFiles(directory=config.FRONTEND_DIST / "assets"),
        name="assets",
    )

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        """Sirve el archivo pedido o el index para las rutas del router."""
        candidate = (config.FRONTEND_DIST / full_path).resolve()
        if full_path and config.FRONTEND_DIST in candidate.parents and candidate.is_file():
            return FileResponse(candidate)
        # El index no se cachea para que el navegador siempre pida la última versión.
        return FileResponse(
            config.FRONTEND_DIST / "index.html",
            headers={"Cache-Control": "no-store"},
        )
