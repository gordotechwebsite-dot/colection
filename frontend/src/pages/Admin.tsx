import { Check, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { api, getAdminToken, setAdminToken } from "../lib/api";
import type {
  AdminStats,
  Category,
  Country,
  Filter,
  Listing,
  ListingStatus,
} from "../lib/types";

type Tab = "moderacion" | "ubicaciones" | "tipos" | "filtros";

const TABS: { value: Tab; label: string }[] = [
  { value: "moderacion", label: "Moderación" },
  { value: "ubicaciones", label: "Países, ciudades y zonas" },
  { value: "tipos", label: "Tipos" },
  { value: "filtros", label: "Filtros" },
];

function AdminLogin({ onReady }: { onReady: () => void }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="card mx-auto max-w-sm space-y-3 p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setAdminToken(token);
        api
          .admin.session()
          .then(onReady)
          .catch(() => {
            setAdminToken(null);
            setError("Token inválido");
          });
      }}
    >
      <h1 className="text-xl font-bold text-brand-700">Panel de control</h1>
      <div>
        <label className="label" htmlFor="admin-token">
          Token de administrador
        </label>
        <input
          id="admin-token"
          type="password"
          className="input"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-brand-700">{error}</p>}
      <button className="btn-primary w-full">Entrar</button>
    </form>
  );
}

function Moderation() {
  const [status, setStatus] = useState<ListingStatus>("pending");
  const [listings, setListings] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({ status, limit: "50" });
    api.admin
      .listings(params)
      .then((page) => setListings(page.items))
      .catch(() => setError("No pudimos cargar los anuncios"));
  }, [status]);

  useEffect(load, [load]);

  async function review(listing: Listing, next: "approved" | "rejected") {
    const reason =
      next === "rejected"
        ? (window.prompt("Motivo del rechazo") ?? undefined)
        : undefined;
    if (next === "rejected" && !reason) return;
    try {
      await api.admin.review(listing.id, next, reason);
      load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos revisar");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["pending", "approved", "rejected"] as ListingStatus[]).map((value) => (
          <button
            key={value}
            type="button"
            className={`filter-btn w-auto ${status === value ? "filter-btn-active" : ""}`}
            onClick={() => setStatus(value)}
          >
            {value === "pending"
              ? "En revisión"
              : value === "approved"
                ? "Publicados"
                : "Rechazados"}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-brand-700">{error}</p>}
      <div className="space-y-2">
        {listings.map((listing) => (
          <div key={listing.id} className="card flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{listing.title}</p>
              <p className="text-xs text-neutral-500">
                {listing.seller.public_id} · {listing.category.name} ·{" "}
                {[listing.zone?.name, listing.city?.name, listing.country.name]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
            {status !== "approved" && (
              <button
                type="button"
                className="btn-primary px-3 py-1 text-xs"
                onClick={() => void review(listing, "approved")}
              >
                <Check size={14} /> Aprobar
              </button>
            )}
            {status !== "rejected" && (
              <button
                type="button"
                className="btn-ghost px-3 py-1 text-xs"
                onClick={() => void review(listing, "rejected")}
              >
                <X size={14} /> Rechazar
              </button>
            )}
          </div>
        ))}
        {listings.length === 0 && (
          <p className="card p-4 text-sm text-neutral-600">No hay anuncios aquí.</p>
        )}
      </div>
    </div>
  );
}

function Locations() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState("");
  const [cityNames, setCityNames] = useState<Record<number, string>>({});
  const [zoneNames, setZoneNames] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.admin
      .countries()
      .then(setCountries)
      .catch(() => setError("No pudimos cargar los países"));
  }, []);

  useEffect(load, [load]);

  function run(promise: Promise<unknown>) {
    promise
      .then(load)
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : "Ocurrió un error"),
      );
  }

  return (
    <div className="space-y-4">
      <form
        className="card flex gap-2 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          run(api.admin.createCountry({ name: country }));
          setCountry("");
        }}
      >
        <input
          className="input"
          placeholder="Nuevo país"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          required
        />
        <button className="btn-primary">
          <Plus size={16} /> Agregar
        </button>
      </form>
      {error && <p className="text-sm text-brand-700">{error}</p>}

      {countries.map((item) => (
        <div key={item.id} className="card space-y-3 p-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{item.name}</h3>
            <button
              type="button"
              className="btn-ghost ml-auto px-2 py-1 text-xs"
              onClick={() => run(api.admin.deleteCountry(item.id))}
            >
              <Trash2 size={14} />
            </button>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              run(
                api.admin.createCity(item.id, { name: cityNames[item.id] ?? "" }),
              );
              setCityNames({ ...cityNames, [item.id]: "" });
            }}
          >
            <input
              className="input"
              placeholder="Nueva ciudad"
              value={cityNames[item.id] ?? ""}
              onChange={(event) =>
                setCityNames({ ...cityNames, [item.id]: event.target.value })
              }
              required
            />
            <button className="btn-ghost">
              <Plus size={14} /> Ciudad
            </button>
          </form>

          <div className="space-y-2 pl-3">
            {item.cities.map((city) => (
              <div key={city.id} className="rounded-lg border border-neutral-200 p-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{city.name}</p>
                  <button
                    type="button"
                    className="btn-ghost ml-auto px-2 py-1 text-xs"
                    onClick={() => run(api.admin.deleteCity(city.id))}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {city.zones.map((zone) => (
                    <span
                      key={zone.id}
                      className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700"
                    >
                      {zone.name}
                      <button
                        type="button"
                        onClick={() => run(api.admin.deleteZone(zone.id))}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    run(
                      api.admin.createZone(city.id, {
                        name: zoneNames[city.id] ?? "",
                      }),
                    );
                    setZoneNames({ ...zoneNames, [city.id]: "" });
                  }}
                >
                  <input
                    className="input"
                    placeholder="Nueva zona"
                    value={zoneNames[city.id] ?? ""}
                    onChange={(event) =>
                      setZoneNames({ ...zoneNames, [city.id]: event.target.value })
                    }
                    required
                  />
                  <button className="btn-ghost text-xs">
                    <Plus size={12} /> Zona
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Types() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.admin
      .categories()
      .then(setCategories)
      .catch(() => setError("No pudimos cargar los tipos"));
  }, []);

  useEffect(load, [load]);

  return (
    <div className="space-y-3">
      <form
        className="card flex gap-2 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          api.admin
            .createCategory({ name })
            .then(() => {
              setName("");
              load();
            })
            .catch((caught: unknown) =>
              setError(caught instanceof Error ? caught.message : "Ocurrió un error"),
            );
        }}
      >
        <input
          className="input"
          placeholder="Nuevo tipo (ej. Vehículos)"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <button className="btn-primary">
          <Plus size={16} /> Agregar
        </button>
      </form>
      {error && <p className="text-sm text-brand-700">{error}</p>}
      <div className="card divide-y">
        {categories.map((category) => (
          <div key={category.id} className="flex items-center gap-2 p-3">
            <p className="text-sm font-medium">{category.name}</p>
            <button
              type="button"
              className="btn-ghost ml-auto px-2 py-1 text-xs"
              onClick={() =>
                api.admin
                  .deleteCategory(category.id)
                  .then(load)
                  .catch((caught: unknown) =>
                    setError(
                      caught instanceof Error ? caught.message : "Ocurrió un error",
                    ),
                  )
              }
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Filters() {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [options, setOptions] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([api.admin.filters(), api.admin.categories()])
      .then(([filterList, categoryList]) => {
        setFilters(filterList);
        setCategories(categoryList);
      })
      .catch(() => setError("No pudimos cargar los filtros"));
  }, []);

  useEffect(load, [load]);

  return (
    <div className="space-y-3">
      <form
        className="card space-y-3 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = options
            .split(",")
            .map((option) => option.trim())
            .filter(Boolean)
            .map((option) => ({ name: option }));
          if (parsed.length === 0) {
            setError("Escribe al menos una variable");
            return;
          }
          api.admin
            .createFilter({
              name,
              category_id: categoryId ? Number(categoryId) : null,
              options: parsed,
            })
            .then(() => {
              setName("");
              setOptions("");
              setCategoryId("");
              load();
            })
            .catch((caught: unknown) =>
              setError(caught instanceof Error ? caught.message : "Ocurrió un error"),
            );
        }}
      >
        <h3 className="font-semibold">Nuevo filtro y sus variables</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className="input"
            placeholder="Nombre del filtro (ej. Condición)"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <select
            className="filter-btn"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Para todos los tipos</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <input
          className="input"
          placeholder="Variables separadas por coma (ej. Nuevo, Usado)"
          value={options}
          onChange={(event) => setOptions(event.target.value)}
          required
        />
        <button className="btn-primary">
          <Plus size={16} /> Crear filtro
        </button>
      </form>
      {error && <p className="text-sm text-brand-700">{error}</p>}
      <div className="space-y-2">
        {filters.map((filter) => (
          <div key={filter.id} className="card p-3">
            <div className="flex items-center gap-2">
              <p className="font-medium">{filter.name}</p>
              <button
                type="button"
                className="btn-ghost ml-auto px-2 py-1 text-xs"
                onClick={() =>
                  api.admin
                    .deleteFilter(filter.id)
                    .then(load)
                    .catch((caught: unknown) =>
                      setError(
                        caught instanceof Error ? caught.message : "Ocurrió un error",
                      ),
                    )
                }
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {filter.options.map((option) => (
                <span
                  key={option.id}
                  className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700"
                >
                  {option.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Admin() {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(Boolean(getAdminToken()));
  const [tab, setTab] = useState<Tab>("moderacion");
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    if (!getAdminToken()) return;
    api.admin
      .session()
      .then(() => setReady(true))
      .catch(() => setAdminToken(null))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!ready) return;
    api.admin
      .stats()
      .then(setStats)
      .catch(() => setStats(null));
  }, [ready, tab]);

  if (checking) return <p className="text-sm text-neutral-600">Cargando…</p>;
  if (!ready) return <AdminLogin onReady={() => setReady(true)} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-brand-700">Panel de control</h1>
        <button
          type="button"
          className="btn-ghost ml-auto"
          onClick={() => {
            setAdminToken(null);
            setReady(false);
          }}
        >
          Salir
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "En revisión", value: stats.pending_listings },
            { label: "Publicados", value: stats.active_listings },
            { label: "Vendedores", value: stats.sellers },
            { label: "Vistas", value: stats.views },
          ].map((item) => (
            <div key={item.label} className="card p-3 text-center">
              <p className="text-2xl font-black text-brand-700">{item.value}</p>
              <p className="text-xs text-neutral-500">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`filter-btn w-auto ${tab === item.value ? "filter-btn-active" : ""}`}
            onClick={() => setTab(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "moderacion" && <Moderation />}
      {tab === "ubicaciones" && <Locations />}
      {tab === "tipos" && <Types />}
      {tab === "filtros" && <Filters />}
    </div>
  );
}
