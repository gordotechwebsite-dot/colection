from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from . import models, security
from .database import get_db


def optional_seller(
    authorization: str = Header(default=""),
    db: Session = Depends(get_db),
) -> models.Seller | None:
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    seller_id = security.read_token(token)
    if seller_id is None:
        return None
    seller = db.get(models.Seller, seller_id)
    if seller is None or not seller.active:
        return None
    return seller


def current_seller(
    seller: models.Seller | None = Depends(optional_seller),
) -> models.Seller:
    if seller is None:
        raise HTTPException(status_code=401, detail="Inicia sesión como vendedor para continuar")
    return seller
