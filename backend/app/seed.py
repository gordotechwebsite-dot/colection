from datetime import timedelta

from .database import SessionLocal
from .models import (
    STATUS_APPROVED,
    STATUS_PENDING,
    Category,
    City,
    Country,
    Filter,
    FilterOption,
    Listing,
    ListingFilterValue,
    ListingSpec,
    Media,
    Seller,
    Zone,
    utcnow,
)
from .ranking import PLAN_FEATURED, PLAN_FREE, PLAN_TOP
from .security import hash_password
from .slugs import slugify

CATEGORIES = [
    {"slug": "vehiculos", "name": "Vehículos", "icon": "Car"},
    {"slug": "inmuebles", "name": "Inmuebles", "icon": "Home"},
    {"slug": "electronica", "name": "Electrónica", "icon": "Smartphone"},
    {"slug": "hogar", "name": "Hogar y Muebles", "icon": "Sofa"},
    {"slug": "moda", "name": "Moda y Accesorios", "icon": "Shirt"},
    {"slug": "servicios", "name": "Servicios", "icon": "Wrench"},
    {"slug": "empleos", "name": "Empleos", "icon": "Briefcase"},
    {"slug": "mascotas", "name": "Mascotas", "icon": "PawPrint"},
]

# Cada ciudad trae zonas iniciales; el admin puede agregar más desde el panel.
COUNTRIES = [
    {
        "name": "Colombia",
        "code": "CO",
        "currency": "COP",
        "cities": {
            "Bogotá": ["Chapinero", "Usaquén", "Teusaquillo"],
            "Medellín": ["El Poblado", "Laureles", "Envigado"],
            "Cali": ["Granada", "San Fernando"],
        },
    },
    {
        "name": "México",
        "code": "MX",
        "currency": "MXN",
        "cities": {
            "Ciudad de México": ["Polanco", "Roma Norte", "Coyoacán"],
            "Guadalajara": ["Providencia", "Chapalita"],
            "Monterrey": ["San Pedro", "Cumbres"],
        },
    },
    {
        "name": "Argentina",
        "code": "AR",
        "currency": "ARS",
        "cities": {
            "Buenos Aires": ["Palermo", "Recoleta", "Belgrano"],
            "Córdoba": ["Nueva Córdoba"],
            "Rosario": ["Centro"],
        },
    },
    {
        "name": "Chile",
        "code": "CL",
        "currency": "CLP",
        "cities": {
            "Santiago": ["Providencia", "Las Condes", "Ñuñoa"],
            "Valparaíso": ["Cerro Alegre"],
        },
    },
    {
        "name": "Perú",
        "code": "PE",
        "currency": "PEN",
        "cities": {
            "Lima": ["Miraflores", "San Isidro", "Barranco"],
            "Arequipa": ["Cercado"],
        },
    },
    {
        "name": "España",
        "code": "ES",
        "currency": "EUR",
        "cities": {
            "Madrid": ["Salamanca", "Chamberí", "Malasaña"],
            "Barcelona": ["Eixample", "Gràcia"],
            "Valencia": ["Ruzafa"],
        },
    },
    {
        "name": "Uruguay",
        "code": "UY",
        "currency": "UYU",
        "cities": {"Montevideo": ["Pocitos", "Ciudad Vieja"]},
    },
    {
        "name": "Estados Unidos",
        "code": "US",
        "currency": "USD",
        "cities": {
            "Miami": ["Brickell", "Wynwood", "Doral"],
            "Nueva York": ["Manhattan", "Brooklyn"],
            "Los Ángeles": ["Downtown", "Santa Mónica"],
        },
    },
]

FILTERS = [
    {"name": "Condición", "category": None, "options": ["Nuevo", "Usado"]},
    {"name": "Tipo de entrega", "category": None, "options": ["Envío", "Entrega en persona"]},
    {"name": "Transmisión", "category": "vehiculos", "options": ["Automática", "Mecánica"]},
    {"name": "Habitaciones", "category": "inmuebles", "options": ["1", "2", "3", "4 o más"]},
    {"name": "Talla", "category": "moda", "options": ["S", "M", "L", "XL"]},
]

SELLERS = [
    {
        "name": "Andrés Gómez",
        "email": "andres@redbook.example.com",
        "contact_channel": "whatsapp",
        "whatsapp": "+573001112233",
        "country": "Colombia",
        "city": "Bogotá",
    },
    {
        "name": "Inmobiliaria Nova",
        "email": "nova@redbook.example.com",
        "contact_channel": "whatsapp",
        "whatsapp": "+525512345678",
        "country": "México",
        "city": "Ciudad de México",
    },
    {
        "name": "Vintage Store",
        "email": "vintage@redbook.example.com",
        "contact_channel": "instagram",
        "instagram": "vintage.store",
        "country": "Uruguay",
        "city": "Montevideo",
    },
    {
        "name": "Store Móvil",
        "email": "storemovil@redbook.example.com",
        "contact_channel": "instagram",
        "instagram": "store.movil",
        "country": "España",
        "city": "Madrid",
    },
    {
        "name": "Plomería Express",
        "email": "plomeria@redbook.example.com",
        "contact_channel": "whatsapp",
        "whatsapp": "+51987654321",
        "country": "Perú",
        "city": "Lima",
    },
]

SAMPLE_VIDEO = (
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
)

LISTINGS = [
    {
        "title": "Mazda 3 2020 Full Equipo",
        "description": (
            "Sedán en excelente estado, único dueño, 45.000 km reales y papeles "
            "al día. Mantenimientos siempre en concesionario, llantas nuevas y "
            "vidrios originales. Recibo vehículo de menor valor."
        ),
        "price": 17500,
        "currency": "USD",
        "seller": "andres@redbook.example.com",
        "country": "Colombia",
        "city": "Bogotá",
        "zone": "Chapinero",
        "cat": "vehiculos",
        "plan": PLAN_TOP,
        "views": 320,
        "clicks": 41,
        "specs": [
            ("Usado", "Sí"),
            ("Hecho en", "Japón"),
            ("Kilometraje", "45.000 km"),
            ("Transmisión", "Automática"),
        ],
        "filters": {"condicion": "usado", "transmision": "automatica"},
        "images": [
            "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200",
            "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200",
            "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1200",
        ],
        "video": SAMPLE_VIDEO,
    },
    {
        "title": "Apartamento amoblado 3 habitaciones",
        "description": (
            "90 m² con dos baños, balcón con vista abierta y parqueadero "
            "cubierto. Conjunto cerrado con gimnasio, salón social y vigilancia "
            "24 horas. Disponible de inmediato, se firma contrato a un año."
        ),
        "price": 138000,
        "currency": "USD",
        "seller": "nova@redbook.example.com",
        "country": "México",
        "city": "Ciudad de México",
        "zone": "Polanco",
        "cat": "inmuebles",
        "plan": PLAN_TOP,
        "views": 210,
        "clicks": 27,
        "specs": [
            ("Área", "90 m²"),
            ("Habitaciones", "3"),
            ("Baños", "2"),
            ("Parqueadero", "Sí"),
        ],
        "filters": {"habitaciones": "3"},
        "images": [
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200",
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200",
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200",
        ],
    },
    {
        "title": "iPhone 14 Pro 128 GB libre",
        "description": (
            "Color morado, libre de operador y sin rayones. Incluye protector, "
            "estuche y cable original; batería al 91% de salud. Factura de "
            "compra disponible y envío asegurado a cualquier país."
        ),
        "price": 780,
        "currency": "USD",
        "seller": "storemovil@redbook.example.com",
        "country": "España",
        "city": "Madrid",
        "zone": "Salamanca",
        "cat": "electronica",
        "plan": PLAN_FEATURED,
        "views": 140,
        "clicks": 15,
        "specs": [
            ("Usado", "Sí"),
            ("Hecho en", "China"),
            ("Almacenamiento", "128 GB"),
            ("Batería", "91%"),
        ],
        "filters": {"condicion": "usado", "tipo-de-entrega": "envio"},
        "images": [
            "https://images.unsplash.com/photo-1678652197831-2d180705cd2c?w=1200",
            "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=1200",
            "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=1200",
        ],
    },
    {
        "title": "Chaqueta de cuero genuino talla M",
        "description": (
            "Cuero genuino curtido, forro interior acolchado y cierres "
            "metálicos reforzados. Usada tres veces, queda como nueva. Talla M "
            "unisex, corte clásico que combina con todo. Envíos a todo el país."
        ),
        "price": 130,
        "currency": "USD",
        "seller": "vintage@redbook.example.com",
        "country": "Uruguay",
        "city": "Montevideo",
        "zone": "Pocitos",
        "cat": "moda",
        "plan": PLAN_FREE,
        "views": 33,
        "clicks": 3,
        "specs": [
            ("Usado", "Sí"),
            ("Hecho en", "Italia"),
            ("Talla", "M"),
            ("Material", "Cuero genuino"),
        ],
        "filters": {"condicion": "usado", "talla": "m"},
        "images": [
            "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1200",
            "https://images.unsplash.com/photo-1520975954732-35dd22299614?w=1200",
            "https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=1200",
        ],
    },
    {
        "title": "Servicio de plomería 24/7",
        "description": (
            "Reparaciones, instalaciones y destape de tuberías con equipo "
            "profesional. Atención inmediata en toda la ciudad, presupuesto sin "
            "costo y garantía escrita de tres meses sobre cada trabajo."
        ),
        "price": 25,
        "currency": "USD",
        "seller": "plomeria@redbook.example.com",
        "country": "Perú",
        "city": "Lima",
        "zone": "Miraflores",
        "cat": "servicios",
        "plan": PLAN_FREE,
        "views": 64,
        "clicks": 12,
        "specs": [("Disponibilidad", "24 horas"), ("Garantía", "3 meses")],
        "filters": {"tipo-de-entrega": "entrega-en-persona"},
        "images": [
            "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=1200",
            "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200",
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200",
        ],
    },
    {
        "title": "Bicicleta MTB rin 29 en aluminio",
        "description": (
            "Grupo Shimano de 12 velocidades, frenos hidráulicos y suspensión "
            "con bloqueo. Ideal para montaña y ciudad, recién sincronizada. "
            "Incluye pedales automáticos y kit de reparación."
        ),
        "price": 460,
        "currency": "USD",
        "seller": "andres@redbook.example.com",
        "country": "Colombia",
        "city": "Medellín",
        "zone": "Laureles",
        "cat": "vehiculos",
        "plan": PLAN_FREE,
        "views": 0,
        "clicks": 0,
        # Queda en verificación para mostrar la cola del panel de administración.
        "status": STATUS_PENDING,
        "specs": [("Usado", "Sí"), ("Rin", "29"), ("Material", "Aluminio")],
        "filters": {"condicion": "usado"},
        "images": [
            "https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=1200",
            "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1200",
            "https://images.unsplash.com/photo-1502744688674-c619d1586c9e?w=1200",
        ],
    },
]

DEMO_PASSWORD = "redbook123"


def seed() -> None:
    db = SessionLocal()
    try:
        if db.query(Category).count() > 0:
            return

        categories: dict[str, Category] = {}
        for data in CATEGORIES:
            category = Category(**data)
            db.add(category)
            categories[data["slug"]] = category

        cities: dict[tuple[str, str], City] = {}
        countries: dict[str, Country] = {}
        zones: dict[tuple[str, str, str], Zone] = {}
        for data in COUNTRIES:
            country = Country(
                slug=slugify(data["name"]),
                name=data["name"],
                code=data["code"],
                currency=data["currency"],
            )
            db.add(country)
            countries[data["name"]] = country
            for name, zone_names in data["cities"].items():
                city = City(country=country, slug=slugify(name), name=name)
                db.add(city)
                cities[(data["name"], name)] = city
                for zone_name in zone_names:
                    zone = Zone(city=city, slug=slugify(zone_name), name=zone_name)
                    db.add(zone)
                    zones[(data["name"], name, zone_name)] = zone

        filters: dict[str, Filter] = {}
        options: dict[tuple[str, str], FilterOption] = {}
        for position, data in enumerate(FILTERS):
            target = Filter(
                slug=slugify(data["name"]),
                name=data["name"],
                category=categories[data["category"]] if data["category"] else None,
                position=position,
            )
            db.add(target)
            filters[target.slug] = target
            for option_position, name in enumerate(data["options"]):
                option = FilterOption(
                    filter=target,
                    slug=slugify(name),
                    name=name,
                    position=option_position,
                )
                db.add(option)
                options[(target.slug, option.slug)] = option

        db.flush()

        sellers: dict[str, Seller] = {}
        for data in SELLERS:
            seller = Seller(
                public_id="",
                name=data["name"],
                email=data["email"],
                password_hash=hash_password(DEMO_PASSWORD),
                contact_channel=data["contact_channel"],
                whatsapp=data.get("whatsapp"),
                instagram=data.get("instagram"),
                country_id=countries[data["country"]].id,
                city_id=cities[(data["country"], data["city"])].id,
            )
            db.add(seller)
            db.flush()
            seller.public_id = f"RB-{seller.id:06d}"
            sellers[data["email"]] = seller

        now = utcnow()
        for index, data in enumerate(LISTINGS):
            bumped_at = now - timedelta(hours=index * 9)
            plan = data["plan"]
            status = data.get("status", STATUS_APPROVED)
            listing = Listing(
                title=data["title"],
                description=data["description"],
                price=data["price"],
                currency=data["currency"],
                seller_id=sellers[data["seller"]].id,
                country_id=countries[data["country"]].id,
                city_id=cities[(data["country"], data["city"])].id,
                zone_id=(
                    zones[(data["country"], data["city"], data["zone"])].id
                    if data.get("zone")
                    else None
                ),
                category_id=categories[data["cat"]].id,
                plan=plan,
                plan_until=now + timedelta(days=15) if plan != PLAN_FREE else None,
                bumped_at=bumped_at,
                created_at=bumped_at,
                submitted_at=bumped_at,
                status=status,
                reviewed_at=bumped_at if status == STATUS_APPROVED else None,
                views=data["views"],
                contact_clicks=data["clicks"],
            )
            for position, url in enumerate(data["images"]):
                listing.media.append(Media(kind="image", url=url, position=position))
            if data.get("video"):
                listing.media.append(
                    Media(kind="video", url=data["video"], position=len(data["images"]))
                )
            for position, (label, value) in enumerate(data["specs"]):
                listing.specs.append(ListingSpec(label=label, value=value, position=position))
            for filter_slug, option_slug in data["filters"].items():
                option = options[(filter_slug, option_slug)]
                listing.filter_values.append(
                    ListingFilterValue(filter_id=option.filter_id, option_id=option.id)
                )
            db.add(listing)

        db.commit()
    finally:
        db.close()
