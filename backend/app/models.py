from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


STATUS_PENDING = "pending"
STATUS_APPROVED = "approved"
STATUS_REJECTED = "rejected"

CHANNEL_WHATSAPP = "whatsapp"
CHANNEL_INSTAGRAM = "instagram"


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    icon = Column(String, nullable=True)
    active = Column(Boolean, default=True, nullable=False)

    listings = relationship("Listing", back_populates="category")
    filters = relationship("Filter", back_populates="category", order_by="Filter.position")


class Country(Base):
    __tablename__ = "countries"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    code = Column(String, nullable=True)
    currency = Column(String, nullable=True)
    active = Column(Boolean, default=True, nullable=False)

    cities = relationship(
        "City",
        back_populates="country",
        cascade="all, delete-orphan",
        order_by="City.name",
        foreign_keys="City.country_id",
    )
    listings = relationship("Listing", back_populates="country", foreign_keys="Listing.country_id")


class City(Base):
    __tablename__ = "cities"
    __table_args__ = (UniqueConstraint("country_id", "slug", name="uq_city_slug"),)

    id = Column(Integer, primary_key=True, index=True)
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=False, index=True)
    slug = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    active = Column(Boolean, default=True, nullable=False)

    country = relationship("Country", back_populates="cities", foreign_keys=[country_id])
    listings = relationship("Listing", back_populates="city", foreign_keys="Listing.city_id")
    zones = relationship(
        "Zone",
        back_populates="city",
        cascade="all, delete-orphan",
        order_by="Zone.name",
        foreign_keys="Zone.city_id",
    )


class Zone(Base):
    """Zona o barrio dentro de una ciudad, administrable desde el panel."""

    __tablename__ = "zones"
    __table_args__ = (UniqueConstraint("city_id", "slug", name="uq_zone_slug"),)

    id = Column(Integer, primary_key=True, index=True)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=False, index=True)
    slug = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    active = Column(Boolean, default=True, nullable=False)

    city = relationship("City", back_populates="zones", foreign_keys=[city_id])
    listings = relationship("Listing", back_populates="zone", foreign_keys="Listing.zone_id")


class Filter(Base):
    """Filtro configurable por el administrador (ej. Condición, Marca)."""

    __tablename__ = "filters"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    # null = filtro global, visible en todas las categorías
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    position = Column(Integer, default=0, nullable=False)
    active = Column(Boolean, default=True, nullable=False)

    category = relationship("Category", back_populates="filters")
    options = relationship(
        "FilterOption",
        back_populates="filter",
        cascade="all, delete-orphan",
        order_by="FilterOption.position",
    )


class FilterOption(Base):
    __tablename__ = "filter_options"
    __table_args__ = (UniqueConstraint("filter_id", "slug", name="uq_option_slug"),)

    id = Column(Integer, primary_key=True, index=True)
    filter_id = Column(Integer, ForeignKey("filters.id"), nullable=False, index=True)
    slug = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    position = Column(Integer, default=0, nullable=False)

    filter = relationship("Filter", back_populates="options")


class Seller(Base):
    """Vendedor registrado. El `public_id` y el canal de contacto viven aquí, no en
    cada anuncio, de modo que todas sus publicaciones muestran el mismo ID y el
    mismo contacto."""

    __tablename__ = "sellers"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    contact_channel = Column(String, default=CHANNEL_WHATSAPP, nullable=False)
    whatsapp = Column(String, nullable=True)
    instagram = Column(String, nullable=True)
    country_id = Column(Integer, ForeignKey("countries.id"), nullable=True)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    country = relationship("Country")
    city = relationship("City")
    listings = relationship("Listing", back_populates="seller")


class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    price = Column(Float, nullable=True)
    currency = Column(String, default="USD", nullable=False)

    country_id = Column(Integer, ForeignKey("countries.id"), nullable=False, index=True)
    city_id = Column(Integer, ForeignKey("cities.id"), nullable=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True, index=True)

    seller_id = Column(Integer, ForeignKey("sellers.id"), nullable=False, index=True)

    plan = Column(String, default="free", nullable=False)
    plan_until = Column(DateTime, nullable=True)
    bumped_at = Column(DateTime, default=utcnow, nullable=False)

    views = Column(Integer, default=0, nullable=False)
    contact_clicks = Column(Integer, default=0, nullable=False)
    active = Column(Boolean, default=True, nullable=False)

    # "pending" | "approved" | "rejected": toda publicación pasa por verificación
    status = Column(String, default=STATUS_PENDING, nullable=False, index=True)
    rejection_reason = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, default=utcnow, nullable=False)

    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    category = relationship("Category", back_populates="listings")
    seller = relationship("Seller", back_populates="listings")
    country = relationship("Country", back_populates="listings", foreign_keys=[country_id])
    city = relationship("City", back_populates="listings", foreign_keys=[city_id])
    zone = relationship("Zone", back_populates="listings", foreign_keys=[zone_id])

    media = relationship(
        "Media",
        back_populates="listing",
        cascade="all, delete-orphan",
        order_by="Media.position",
    )
    filter_values = relationship(
        "ListingFilterValue", back_populates="listing", cascade="all, delete-orphan"
    )
    specs = relationship(
        "ListingSpec",
        back_populates="listing",
        cascade="all, delete-orphan",
        order_by="ListingSpec.position",
    )

    created_at = Column(DateTime, default=utcnow, nullable=False)


class ListingFilterValue(Base):
    __tablename__ = "listing_filter_values"
    __table_args__ = (UniqueConstraint("listing_id", "filter_id", name="uq_listing_filter"),)

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=False, index=True)
    filter_id = Column(Integer, ForeignKey("filters.id"), nullable=False, index=True)
    option_id = Column(Integer, ForeignKey("filter_options.id"), nullable=False, index=True)

    listing = relationship("Listing", back_populates="filter_values")
    filter = relationship("Filter")
    option = relationship("FilterOption")


class ListingSpec(Base):
    """Fila de la tabla de descripción personalizada del anuncio."""

    __tablename__ = "listing_specs"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=False, index=True)
    label = Column(String, nullable=False)
    value = Column(String, nullable=False)
    position = Column(Integer, default=0, nullable=False)

    listing = relationship("Listing", back_populates="specs")


class Media(Base):
    __tablename__ = "media"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=False, index=True)
    kind = Column(String, nullable=False)  # "image" | "video"
    url = Column(String, nullable=False)
    position = Column(Integer, default=0, nullable=False)

    listing = relationship("Listing", back_populates="media")


class Banner(Base):
    """Banner de la portada, editable desde el panel de administración.

    `slot` define dónde se muestra: `home_top` arriba de todo y `home_middle`
    entre los anuncios top y los destacados.
    """

    __tablename__ = "banners"

    id = Column(Integer, primary_key=True, index=True)
    slot = Column(String, nullable=False, default="home_top", unique=True, index=True)
    title = Column(String, nullable=False, default="")
    subtitle = Column(String, nullable=False, default="")
    image_url = Column(String, nullable=True)
    link_url = Column(String, nullable=True)
    link_label = Column(String, nullable=True)
    active = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
