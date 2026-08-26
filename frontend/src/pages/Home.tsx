import { Search, X } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import FilterBar from "../components/FilterBar";
import ListingCard from "../components/ListingCard";
import HomeBanner from "../components/HomeBanner";
import { api } from "../lib/api";
import { DEFAULT_FILTERS, type FilterState } from "../lib/filters";
import type { Banner, Category, Country, Listing } from "../lib/types";

const PAGE_SIZE = 24;

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // La búsqueda no se conserva: cada carga de la portada arranca en blanco.
  const [query, setQuery] = useState("");
  const [started, setStarted] = useState(false);
  const [focused, setFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const useDefaults =
    !started &&
    !["country", "city", "zone", "category"].some((key) => searchParams.get(key));

  const filters = useMemo<FilterState>(
    () =>
      useDefaults
        ? DEFAULT_FILTERS
        : {
            country: searchParams.get("country") ?? "",
            city: searchParams.get("city") ?? "",
            zone: searchParams.get("zone") ?? "",
            category: searchParams.get("category") ?? "",
          },
    [searchParams, useDefaults],
  );
  const page = Number(searchParams.get("page") ?? "1");

  useEffect(() => {
    if (started) return;
    const initial = new URLSearchParams(searchParams);
    initial.delete("q");
    if (useDefaults) {
      Object.entries(DEFAULT_FILTERS).forEach(([key, value]) => {
        if (value) initial.set(key, value);
      });
    }
    if (initial.toString() !== searchParams.toString()) {
      setSearchParams(initial, { replace: true });
    }
    setStarted(true);
  }, [started, useDefaults, searchParams, setSearchParams]);

  useEffect(() => {
    Promise.all([api.countries(), api.categories()])
      .then(([countryList, categoryList]) => {
        setCountries(countryList);
        setCategories(categoryList);
      })
      .catch(() => setError("No pudimos cargar los filtros"));
    api
      .banners()
      .then(setBanners)
      .catch(() => undefined);
  }, []);

  // La búsqueda se aplica sola mientras se escribe, en toda la web.
  useEffect(() => {
    if (!started) return;
    const text = query.trim();
    if (text === (searchParams.get("q") ?? "")) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (text) {
        params.set("q", text);
        ["country", "city", "zone", "category"].forEach((key) =>
          params.delete(key),
        );
      } else {
        params.delete("q");
      }
      params.delete("page");
      setSearchParams(params, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, started, searchParams, setSearchParams]);

  useEffect(() => {
    if (!started) return;
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    params.set("sort", "relevance");
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String((page - 1) * PAGE_SIZE));

    let current = true;
    setLoading(true);
    api
      .listings(params)
      .then((data) => {
        if (!current) return;
        setListings(data.items);
        setTotal(data.total);
        setError(null);
      })
      .catch(() => {
        if (current) setError("No pudimos cargar las publicaciones");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [filters, searchParams, page, started]);

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
  const groups = ["top", "featured", "free"].map((plan) => ({
    plan,
    items: listings.filter((listing) => listing.effective_plan === plan),
  }));
  const activeBanner = (slot: string) =>
    banners.find((item) => item.slot === slot && item.active) ?? null;
  const topBanner = activeBanner("home_top");
  const middleBanner = activeBanner("home_middle");
  // Al buscar, el resto de la portada se desenfoca para destacar los resultados.
  const dim = focused || query.trim().length > 0;
  const dimClass = dim ? "pointer-events-none blur-sm opacity-50 transition" : "transition";

  return (
    <div className="space-y-5">
      {topBanner && (
        <div className={dimClass}>
          <HomeBanner banner={topBanner} />
        </div>
      )}

      <div
        ref={searchRef}
        className={
          dim
            ? "sticky top-0 z-30 -mx-4 border-b border-brand-100 bg-white/90 px-4 py-3 backdrop-blur"
            : ""
        }
      >
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            className={`input !pl-9 ${dim ? "!pr-9" : ""}`}
            placeholder="¿Qué estás buscando?"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => {
              setFocused(true);
              searchRef.current?.scrollIntoView({ block: "start" });
            }}
            onBlur={() => setFocused(false)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setQuery("");
                event.currentTarget.blur();
              }
            }}
          />
          {dim && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-500"
              title="Cerrar la búsqueda"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setQuery("");
                setFocused(false);
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className={dimClass}>
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
      </div>

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
          <Fragment key={group.plan}>
            {group.plan === "featured" && middleBanner && (
              <HomeBanner banner={middleBanner} />
            )}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {group.items.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </Fragment>
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
