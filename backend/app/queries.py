from sqlalchemy import or_
from sqlalchemy.orm import Query, Session, joinedload

from . import models, ranking


def base_query(db: Session) -> Query:
    return db.query(models.Listing).options(
        joinedload(models.Listing.category),
        joinedload(models.Listing.seller).joinedload(models.Seller.country),
        joinedload(models.Listing.seller).joinedload(models.Seller.city),
        joinedload(models.Listing.country),
        joinedload(models.Listing.city),
        joinedload(models.Listing.zone),
        joinedload(models.Listing.media),
        joinedload(models.Listing.specs),
        joinedload(models.Listing.filter_values).joinedload(models.ListingFilterValue.filter),
        joinedload(models.Listing.filter_values).joinedload(models.ListingFilterValue.option),
    )


def apply_filters(
    query: Query,
    *,
    category: str | None = None,
    country: str | None = None,
    city: str | None = None,
    zone: str | None = None,
    q: str | None = None,
    seller: str | None = None,
    plan: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    active: bool | None = True,
    status: str | None = None,
    filter_specs: list[str] | None = None,
) -> Query:
    if active is not None:
        query = query.filter(models.Listing.active.is_(active))
    if status:
        query = query.filter(models.Listing.status == status)
    if category:
        query = query.join(models.Category).filter(models.Category.slug == category)
    if country:
        query = query.join(models.Country).filter(models.Country.slug == country)
    if city:
        query = query.join(models.City).filter(models.City.slug == city)
    if zone:
        query = query.join(models.Zone).filter(models.Zone.slug == zone)
    if seller:
        query = query.join(models.Seller).filter(models.Seller.public_id == seller)
    if plan:
        query = query.filter(models.Listing.plan == plan)
    if min_price is not None:
        query = query.filter(models.Listing.price >= min_price)
    if max_price is not None:
        query = query.filter(models.Listing.price <= max_price)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                models.Listing.title.ilike(like),
                models.Listing.description.ilike(like),
            )
        )
    for spec in filter_specs or []:
        if ":" not in spec:
            continue
        filter_slug, option_slug = spec.split(":", 1)
        values = (
            query.session.query(models.ListingFilterValue.listing_id)
            .join(
                models.Filter,
                models.Filter.id == models.ListingFilterValue.filter_id,
            )
            .join(
                models.FilterOption,
                models.FilterOption.id == models.ListingFilterValue.option_id,
            )
            .filter(
                models.Filter.slug == filter_slug,
                models.FilterOption.slug == option_slug,
            )
        )
        query = query.filter(models.Listing.id.in_(values.subquery().select()))
    return query


def sort_listings(listings: list[models.Listing], sort: str) -> list[models.Listing]:
    """Ordena en memoria porque el score de posicionamiento es calculado."""
    if sort == "recent":
        return sorted(listings, key=lambda item: item.created_at, reverse=True)
    if sort == "price_asc":
        return sorted(
            listings,
            key=lambda item: (item.price is None, item.price or 0),
        )
    if sort == "price_desc":
        return sorted(listings, key=lambda item: item.price or 0, reverse=True)
    if sort == "views":
        return sorted(listings, key=lambda item: item.views, reverse=True)
    return sorted(listings, key=ranking.score, reverse=True)
