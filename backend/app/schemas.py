import re
from datetime import datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from .config import MAX_IMAGES, MAX_VIDEOS, MIN_IMAGES
from .ranking import PLAN_FEATURED, PLAN_TOP

WHATSAPP_RE = re.compile(r"^\+?[0-9]{8,15}$")
INSTAGRAM_RE = re.compile(r"^[A-Za-z0-9._]{1,30}$")

ContactChannel = Literal["whatsapp", "instagram"]


def normalize_whatsapp(value: str) -> str:
    cleaned = re.sub(r"[\s\-().]", "", value)
    if not WHATSAPP_RE.match(cleaned):
        raise ValueError("El WhatsApp debe incluir el indicativo del país, ej. +573001112233")
    return cleaned if cleaned.startswith("+") else f"+{cleaned}"


def normalize_instagram(value: str) -> str:
    cleaned = value.strip()
    cleaned = re.sub(r"^https?://(www\.)?instagram\.com/", "", cleaned)
    cleaned = cleaned.strip("/@").split("?")[0]
    if not INSTAGRAM_RE.match(cleaned):
        raise ValueError("El usuario de Instagram no es válido, ej. @mitienda")
    return cleaned


class CategoryIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    icon: str | None = None
    active: bool = True


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    icon: str | None = None
    active: bool = True


class ZoneIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    active: bool = True


class ZoneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    city_id: int
    active: bool = True


class CityIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    active: bool = True


class CityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    country_id: int
    active: bool = True
    zones: list[ZoneOut] = []


class CountryIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    code: str | None = Field(default=None, max_length=4)
    currency: str | None = Field(default=None, max_length=5)
    active: bool = True


class CountryRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    code: str | None = None
    currency: str | None = None
    active: bool = True


class CountryOut(CountryRef):
    cities: list[CityOut] = []


class FilterOptionIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)


class FilterOptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    position: int


class FilterIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    category_id: int | None = None
    position: int = 0
    active: bool = True
    options: list[FilterOptionIn] = Field(min_length=1)


class FilterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    name: str
    category_id: int | None = None
    position: int
    active: bool
    options: list[FilterOptionOut] = []


class MediaIn(BaseModel):
    kind: Literal["image", "video"]
    url: str
    position: int = 0


class MediaOut(MediaIn):
    model_config = ConfigDict(from_attributes=True)

    id: int


class SpecIn(BaseModel):
    """Fila de la tabla de descripción, ej. label="Hecho en", value="Italia"."""

    label: str = Field(min_length=1, max_length=60)
    value: str = Field(min_length=1, max_length=200)


class SpecOut(SpecIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    position: int


class ListingFilterValueOut(BaseModel):
    filter_id: int
    filter_slug: str
    filter_name: str
    option_id: int
    option_slug: str
    option_name: str


class ContactMixin(BaseModel):
    """Canal de comunicación del vendedor: WhatsApp (número) o Instagram (usuario)."""

    contact_channel: ContactChannel = "whatsapp"
    whatsapp: str | None = None
    instagram: str | None = None

    @field_validator("whatsapp")
    @classmethod
    def check_whatsapp(cls, value: str | None) -> str | None:
        return normalize_whatsapp(value) if value else None

    @field_validator("instagram")
    @classmethod
    def check_instagram(cls, value: str | None) -> str | None:
        return normalize_instagram(value) if value else None

    @model_validator(mode="after")
    def check_channel(self) -> "ContactMixin":
        if self.contact_channel == "whatsapp" and not self.whatsapp:
            raise ValueError("Escribe tu número de WhatsApp con indicativo del país")
        if self.contact_channel == "instagram" and not self.instagram:
            raise ValueError("Escribe tu usuario de Instagram")
        return self


class SellerRegister(ContactMixin):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    country_id: int | None = None
    city_id: int | None = None


class SellerLogin(BaseModel):
    email: EmailStr
    password: str


class SellerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    contact_channel: ContactChannel | None = None
    whatsapp: str | None = None
    instagram: str | None = None
    country_id: int | None = None
    city_id: int | None = None

    @field_validator("whatsapp")
    @classmethod
    def check_whatsapp(cls, value: str | None) -> str | None:
        return normalize_whatsapp(value) if value else value

    @field_validator("instagram")
    @classmethod
    def check_instagram(cls, value: str | None) -> str | None:
        return normalize_instagram(value) if value else value


class SellerOut(BaseModel):
    """Datos públicos del vendedor: el mismo ID y contacto en todos sus anuncios."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    public_id: str
    name: str
    contact_channel: str
    whatsapp: str | None = None
    instagram: str | None = None
    country: CountryRef | None = None
    city: CityOut | None = None
    created_at: datetime


class SellerAccount(SellerOut):
    email: EmailStr
    active: bool


class AuthOut(BaseModel):
    token: str
    seller: SellerAccount


class ListingBase(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=20, max_length=5000)
    price: float | None = Field(default=None, ge=0)
    currency: str = "USD"


class ListingCreate(ListingBase):
    category_id: int
    country_id: int
    city_id: int | None = None
    zone_id: int | None = None
    media: list[MediaIn]
    specs: list[SpecIn] = []
    # {filter_id: option_id}
    filter_values: dict[int, int] = {}

    @model_validator(mode="after")
    def check_media(self) -> "ListingCreate":
        images = [m for m in self.media if m.kind == "image"]
        videos = [m for m in self.media if m.kind == "video"]
        if len(images) < MIN_IMAGES:
            raise ValueError(f"Debes subir al menos {MIN_IMAGES} fotos.")
        if len(images) > MAX_IMAGES:
            raise ValueError(f"Máximo {MAX_IMAGES} fotos por publicación.")
        if len(videos) > MAX_VIDEOS:
            raise ValueError(f"Máximo {MAX_VIDEOS} video por publicación.")
        return self


class ListingOut(ListingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    category: CategoryOut
    seller: SellerOut
    country: CountryRef
    city: CityOut | None = None
    zone: ZoneOut | None = None
    media: list[MediaOut]
    specs: list[SpecOut] = []
    filters: list[ListingFilterValueOut] = []
    plan: str
    effective_plan: str
    plan_label: str
    plan_until: datetime | None = None
    bumped_at: datetime
    score: float
    views: int
    contact_clicks: int
    active: bool
    status: str
    status_label: str
    rejection_reason: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    contact_channel: str
    contact_label: str
    contact_url: str


class ListingPage(BaseModel):
    items: list[ListingOut]
    total: int
    limit: int
    offset: int


class ListingSubmitted(BaseModel):
    """Respuesta al enviar un anuncio: queda en verificación 1 a 3 días."""

    listing: ListingOut
    review_min_days: int = 1
    review_max_days: int = 3
    message: str = (
        "Recibimos tu anuncio y está en verificación. "
        "Este proceso tarda entre 1 y 3 días; te avisamos cuando quede publicado."
    )


class ReviewIn(BaseModel):
    status: Literal["approved", "rejected"]
    rejection_reason: str | None = Field(default=None, max_length=300)


class PromoteIn(BaseModel):
    plan: Literal[PLAN_FEATURED, PLAN_TOP]
    days: int = Field(default=7, ge=1, le=90)


class UploadedMedia(BaseModel):
    kind: Literal["image", "video"]
    url: str
    filename: str


class MediaLimits(BaseModel):
    min_images: int
    max_images: int
    max_videos: int
    max_image_mb: int
    max_video_mb: int


class BannerIn(BaseModel):
    """Banner de la portada configurado desde el panel."""

    title: str = Field(default="", max_length=120)
    subtitle: str = Field(default="", max_length=240)
    image_url: str | None = Field(default=None, max_length=500)
    link_url: str | None = Field(default=None, max_length=500)
    link_label: str | None = Field(default=None, max_length=40)
    active: bool = True


class BannerOut(BannerIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slot: str
