import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import FilterBar from "../components/FilterBar";
import ListingCard from "../components/ListingCard";
import HomeBanner from "../components/HomeBanner";
import { api } from "../lib/api";
import type { FilterState } from "../lib/filters";
import type { Banner, Category, Country, Listing } from "../lib/types";

const PAGE_SIZE = 24;

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  const filters = useMemo<FilterState>(
    () => ({
      country: searchParams.get("country") ?? "",
      city: searchParams.get("city") ?? "",
      zone: searchParams.get("zone") ?? "",
      category: searchParams.get("category") ?? "",
    }),
    [searchParams],
  );
  const page = Number(searchParams.get("page") ?? "1");

  useEffect(() => {
    Promise.all([api.countries(), api.categories()])
      .then(([countryList, categoryList]) => {
        setCountries(countryList);
        setCategories(categoryList);
      })
      .catch(() => setError("No pudimos cargar los filtros"));
    api
      .banner()
      .then(setBanner)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    params.set("sort", "relevance");
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String((page - 1) * PAGE_SIZE));

    setLoading(true);
    api
      .listings(params)
      .then((data) => {
        setListings(data.items);
        setTotal(data.total);
        setError(null);
      })
      .catch(() => setError("No pudimos cargar las publicaciones"))
      .finally(() => setLoading(false));
  }, [filters, searchParams, page]);

  function update(next: Partial<Record<string, string>>) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    params.delete("page");
    setSearchParams(params);
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const groups = [
    { plan: "top", title: "TOP", accent: "bg-amber-400 text-amber-950" },
    { plan: "featured", title: "Destacados", accent: "bg-purple-400 text-white" },
    { plan: "free", title: "Más publicaciones", accent: "bg-white text-brand-700" },
  ].map((group) => ({
    ...group,
    items: listings.filter((listing) => listing.effective_plan === group.plan),
  }));

  return (
    <div className="space-y-5">
      {banner?.active && <HomeBanner banner={banner} />}

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: query });
        }}
      >
        <input
          className="input"
          placeholder="¿Qué estás buscando?"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="btn-primary" type="submit">
          <Search size={16} /> Buscar
        </button>
      </form>

      <FilterBar
        countries={countries}
        categories={categories}
        value={filters}
        onChange={(next) =>
          update({
            country: next.country,
            city: next.city,
            zone: next.zone,
            category: next.category,
          })
        }
      />

      {error && <p className="card p-4 text-sm text-brand-700">{error}</p>}

      {!loading && listings.length === 0 && !error && (
        <p className="card p-6 text-center text-sm text-neutral-600">
          No hay publicaciones con esos filtros. Prueba con otra combinación o{" "}
          <button
            type="button"
            className="font-semibold text-brand-700 underline"
            onClick={() => setSearchParams(new URLSearchParams())}
          >
            limpia la búsqueda
          </button>
          .
        </p>
      )}

      {groups
        .filter((group) => group.items.length > 0)
        .map((group) => (
          <section key={group.plan} className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand-800">
              <span className={`rounded-full px-2 py-0.5 text-xs ${group.accent}`}>
                {group.title}
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {group.items.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </section>
        ))}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            className="btn-ghost"
            disabled={page <= 1}
            onClick={() => {
              const params = new URLSearchParams(searchParams);
              params.set("page", String(page - 1));
              setSearchParams(params);
            }}
          >
            Anterior
          </button>
          <span className="text-sm text-neutral-600">
            {page} de {pages}
          </span>
          <button
            className="btn-ghost"
            disabled={page >= pages}
            onClick={() => {
              const params = new URLSearchParams(searchParams);
              params.set("page", String(page + 1));
              setSearchParams(params);
            }}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
