from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from . import crud, models, queries, schemas, security, serializers
from .database import get_db
from .deps import current_seller

router = APIRouter(prefix="/api/sellers", tags=["vendedores"])


@router.post("/register", response_model=schemas.AuthOut, status_code=201)
def register(payload: schemas.SellerRegister, db: Session = Depends(get_db)):
    seller = crud.create_seller(db, payload)
    return schemas.AuthOut(token=security.create_token(seller.id), seller=seller)


@router.post("/login", response_model=schemas.AuthOut)
def login(payload: schemas.SellerLogin, db: Session = Depends(get_db)):
    seller = db.query(models.Seller).filter(models.Seller.email == payload.email.lower()).first()
    if not seller or not security.verify_password(payload.password, seller.password_hash):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    if not seller.active:
        raise HTTPException(status_code=403, detail="Esta cuenta está desactivada")
    return schemas.AuthOut(token=security.create_token(seller.id), seller=seller)


@router.get("/me", response_model=schemas.SellerAccount)
def me(seller: models.Seller = Depends(current_seller)):
    return seller


@router.patch("/me", response_model=schemas.SellerAccount)
def update_me(
    payload: schemas.SellerUpdate,
    seller: models.Seller = Depends(current_seller),
    db: Session = Depends(get_db),
):
    """Actualiza el perfil. Al cambiar canal o contacto, cambia en todos sus anuncios."""
    return crud.update_seller(db, seller, payload)


@router.get("/me/listings", response_model=list[schemas.ListingOut])
def my_listings(
    seller: models.Seller = Depends(current_seller),
    db: Session = Depends(get_db),
):
    listings = (
        queries.base_query(db)
        .filter(models.Listing.seller_id == seller.id)
        .order_by(models.Listing.created_at.desc())
        .all()
    )
    return [serializers.listing_out(item) for item in listings]
