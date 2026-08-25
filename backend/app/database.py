from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import DATABASE_URL

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_schema() -> None:
    """Añade columnas nuevas a bases de datos creadas con versiones anteriores."""
    inspector = inspect(engine)
    if "banners" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("banners")}
    if "slot" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE banners ADD COLUMN slot VARCHAR DEFAULT 'home_top'")
            )
            connection.execute(
                text("UPDATE banners SET slot = 'home_top' WHERE slot IS NULL")
            )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
