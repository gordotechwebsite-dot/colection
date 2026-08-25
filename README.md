# Redbook

Clasificados globales: los vendedores se registran, obtienen un ID público
permanente (`RB-000123`) y publican anuncios con mínimo 3 fotos, un video
opcional, tabla de detalles y contacto directo por WhatsApp o Instagram. Cada
anuncio pasa por verificación (1 a 3 días) antes de ser visible.

## Estructura

- `backend/`: API FastAPI + SQLAlchemy (SQLite por defecto).
- `frontend/`: React + TypeScript + Vite + Tailwind.

## Backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload
```

Al arrancar con la base vacía se cargan datos de ejemplo (países, ciudades,
zonas, tipos, filtros, vendedores y anuncios demo).

Pruebas y lint:

```bash
.venv/bin/python -m pytest
.venv/bin/ruff check .
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Verificaciones: `npm run lint`, `npm run typecheck`, `npm run build`.

## Variables de entorno

Ver `.env.example`. El panel de administración usa `ADMIN_TOKEN`
(cabecera `X-Admin-Token`) y las sesiones de vendedor se firman con
`SECRET_KEY`.

## Panel de administración (`/admin`)

- Moderación: aprobar o rechazar anuncios con motivo.
- Países, ciudades y zonas.
- Tipos (categorías).
- Filtros configurables con sus variables.

## Filtros públicos

País → Ciudad → Zona → Tipo, encadenados. El vendedor elige la misma
ubicación al publicar.
