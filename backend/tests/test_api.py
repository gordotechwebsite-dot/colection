import os
import tempfile

import pytest
from fastapi.testclient import TestClient

TMP = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{TMP}/test.db"
os.environ["MEDIA_DIR"] = f"{TMP}/media"

from app.main import app  # noqa: E402

client = TestClient(app)

IMAGES = [
    {"kind": "image", "url": "/media/a.jpg"},
    {"kind": "image", "url": "/media/b.jpg"},
    {"kind": "image", "url": "/media/c.jpg"},
]
ADMIN_HEADERS = {"X-Admin-Token": "redbook-admin"}


@pytest.fixture(scope="module")
def location():
    country = client.get("/api/countries").json()[0]
    return country["id"], country["cities"][0]["id"]


def register(email: str, **extra) -> dict:
    payload = {
        "name": "Tienda Demo",
        "email": email,
        "password": "supersecreta",
        "whatsapp": "+573001234567",
    }
    payload.update(extra)
    response = client.post("/api/sellers/register", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_health_and_seed():
    assert client.get("/api/health").json() == {"status": "ok"}
    listings = client.get("/api/listings").json()
    assert listings["total"] > 0
    # Los anuncios en verificación no salen en el listado público.
    assert all(item["status"] == "approved" for item in listings["items"])


def test_public_id_is_stable_across_listings(location):
    country_id, city_id = location
    auth = register("vendedor1@example.com")
    token = {"Authorization": f"Bearer {auth['token']}"}
    public_id = auth["seller"]["public_id"]
    assert public_id.startswith("RB-")

    category_id = client.get("/api/categories").json()[0]["id"]
    body = {
        "title": "Producto de prueba",
        "description": "Descripción larga para pasar la validación mínima de texto.",
        "price": 100,
        "category_id": category_id,
        "country_id": country_id,
        "city_id": city_id,
        "media": IMAGES,
        "specs": [{"label": "Hecho en", "value": "Italia"}],
    }
    first = client.post("/api/listings", json=body, headers=token)
    assert first.status_code == 201, first.text
    submitted = first.json()
    assert submitted["listing"]["status"] == "pending"
    assert "1 y 3 días" in submitted["message"]

    second = client.post("/api/listings", json=body, headers=token).json()
    assert second["listing"]["seller"]["public_id"] == public_id
    assert second["listing"]["seller"]["whatsapp"] == submitted["listing"]["seller"]["whatsapp"]

    listing_id = submitted["listing"]["id"]
    # Aún no aprobado: no debe ser visible al público.
    assert client.get(f"/api/listings/{listing_id}").status_code == 404

    review = client.post(
        f"/api/admin/listings/{listing_id}/review",
        json={"status": "approved"},
        headers=ADMIN_HEADERS,
    )
    assert review.status_code == 200, review.text
    assert review.json()["status"] == "approved"
    assert client.get(f"/api/listings/{listing_id}").status_code == 200


def test_listing_requires_login(location):
    country_id, _ = location
    category_id = client.get("/api/categories").json()[0]["id"]
    response = client.post(
        "/api/listings",
        json={
            "title": "Sin sesión",
            "description": "Descripción larga para pasar la validación mínima.",
            "category_id": category_id,
            "country_id": country_id,
            "media": IMAGES,
        },
    )
    assert response.status_code == 401


def test_min_three_images(location):
    country_id, _ = location
    auth = register("vendedor2@example.com")
    token = {"Authorization": f"Bearer {auth['token']}"}
    category_id = client.get("/api/categories").json()[0]["id"]
    response = client.post(
        "/api/listings",
        json={
            "title": "Pocas fotos",
            "description": "Descripción larga para pasar la validación mínima.",
            "category_id": category_id,
            "country_id": country_id,
            "media": IMAGES[:2],
        },
        headers=token,
    )
    assert response.status_code == 422


def test_instagram_channel_links_to_dm():
    auth = register(
        "insta@example.com",
        contact_channel="instagram",
        instagram="@mi.tienda",
        whatsapp=None,
    )
    token = {"Authorization": f"Bearer {auth['token']}"}
    assert auth["seller"]["instagram"] == "mi.tienda"

    listing = client.get("/api/listings").json()["items"][0]
    assert listing["contact_url"].startswith("https://")

    changed = client.patch(
        "/api/sellers/me",
        json={"contact_channel": "whatsapp", "whatsapp": "+573009998877"},
        headers=token,
    )
    assert changed.status_code == 200, changed.text
    assert changed.json()["contact_channel"] == "whatsapp"


def test_whatsapp_link_has_prefilled_message():
    listings = client.get("/api/listings").json()["items"]
    whatsapp = [item for item in listings if item["contact_channel"] == "whatsapp"]
    assert whatsapp
    assert "wa.me" in whatsapp[0]["contact_url"]
    assert "text=" in whatsapp[0]["contact_url"]

    instagram = [item for item in listings if item["contact_channel"] == "instagram"]
    assert instagram
    assert instagram[0]["contact_url"].startswith("https://ig.me/m/")


def test_admin_configures_home_banner():
    default = client.get("/api/banner")
    assert default.status_code == 200
    assert default.json()["active"] is True

    saved = client.put(
        "/api/admin/banner",
        json={
            "title": "Ofertas de la semana",
            "subtitle": "Publica gratis en Redbook",
            "link_url": "/registro",
            "link_label": "Anunciarme",
            "active": True,
        },
        headers=ADMIN_HEADERS,
    )
    assert saved.status_code == 200, saved.text

    public = client.get("/api/banner").json()
    assert public["title"] == "Ofertas de la semana"
    assert public["link_label"] == "Anunciarme"


def test_delete_country_reports_listings_and_forces():
    country = client.get("/api/countries").json()[0]
    blocked = client.delete(f"/api/admin/countries/{country['id']}", headers=ADMIN_HEADERS)
    assert blocked.status_code == 409
    assert "anuncio" in blocked.json()["detail"]

    forced = client.delete(
        f"/api/admin/countries/{country['id']}?force=true", headers=ADMIN_HEADERS
    )
    assert forced.status_code == 204, forced.text
    assert country["id"] not in [item["id"] for item in client.get("/api/countries").json()]
