from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import DATABASE_URL

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


NEW_COLUMNS = {
    "banners": {"slot": "VARCHAR DEFAULT 'home_top'"},
    "sellers": {
        "seller_type": "VARCHAR DEFAULT 'independent'",
        "telegram": "VARCHAR DEFAULT NULL",
        "phone": "VARCHAR DEFAULT NULL",
    },
    "listings": {
        "display_name": "VARCHAR DEFAULT ''",
        "verified": "BOOLEAN DEFAULT 0",
    },
}


def ensure_schema() -> None:
    """Añade columnas nuevas a bases de datos creadas con versiones anteriores."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    for table, new_columns in NEW_COLUMNS.items():
        if table not in tables:
            continue
        existing = {column["name"] for column in inspector.get_columns(table)}
        missing = {
            name: definition
            for name, definition in new_columns.items()
            if name not in existing
        }
        if not missing:
            continue
        with engine.begin() as connection:
            for name, definition in missing.items():
                connection.execute(
                    text(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")
                )
                default = definition.split("DEFAULT ", 1)[1]
                connection.execute(
                    text(f"UPDATE {table} SET {name} = {default} WHERE {name} IS NULL")
                )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
