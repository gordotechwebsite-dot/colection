import { Search, X } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import FilterBar from "../components/FilterBar";
import ListingCard from "../components/ListingCard";
import HomeBanner from "../components/HomeBanner";
import { api } from "../lib/api";
import { DEFAULT_FILTERS, type FilterState } from "../lib/filters";
import { locationPath } from "../lib/routes";
import { usePageSeo } from "../lib/seo";
import type { Banner, Category, Country, Listing } from "../lib/types";

const PAGE_SIZE = 24;

export default function Home() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const path = useParams<{ country?: string; city?: string; zone?: string }>();
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
  // Sin ubicación en la ruta ni búsqueda, la portada abre en la ubicación por defecto.
  const useDefaults = !started && !path.country && !searchParams.get("q");

  const filters = useMemo<FilterState>(
    () =>
      useDefaults
        ? DEFAULT_FILTERS
        : {
            country: path.country ?? searchParams.get("country") ?? "",
            city: path.city ?? searchParams.get("city") ?? "",
            zone: path.zone ?? searchParams.get("zone") ?? "",
            category: searchParams.get("category") ?? "",
          },
    [path, searchParams, useDefaults],
  );
  const page = Number(searchParams.get("page") ?? "1");

  useEffect(() => {
    if (started) return;
    setStarted(true);
    const params = new URLSearchParams(searchParams);
    params.delete("q");
    // Las URL viejas con ?country=... pasan a la ruta equivalente.
    ["country", "city", "zone"].forEach((key) => params.delete(key));
    const target = locationPath(useDefaults ? DEFAULT_FILTERS : filters);
    const search = params.toString();
    navigate(search ? `${target}?${search}` : target, { replace: true });
  }, [started, useDefaults, filters, searchParams, navigate]);

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
      // La búsqueda es global: sale de la ruta de ubicación y del tipo.
      navigate(text ? `/?q=${encodeURIComponent(text)}` : "/", { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, started, searchParams, navigate]);

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

  function update(next: FilterState) {
    const params = new URLSearchParams();
    if (next.category) params.set("category", next.category);
    const search = params.toString();
    const target = locationPath(next);
    navigate(search ? `${target}?${search}` : target);
  }

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(next));
    navigate(`${locationPath(filters)}?${params.toString()}`);
  }

  const country = countries.find((item) => item.slug === filters.country);
  const city = country?.cities.find((item) => item.slug === filters.city);
  const zone = city?.zones.find((item) => item.slug === filters.zone);
  const place = [zone?.name, city?.name, country?.name].filter(Boolean).join(", ");
  usePageSeo(
    place ? `Anuncios en ${place} | Redbook` : "Redbook, clasificados globales",
    place
      ? `Anuncios verificados en ${place}. Fotos, video y contacto directo por WhatsApp.`
      : "Clasificados globales con fotos, video y contacto directo por WhatsApp.",
    locationPath(filters),
  );

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const groups = ["top", "featured", "free"].map((plan) => ({
    plan,
    items: listings.filter((listing) => listing.effective_plan === plan),
  }));
  const activeBanner = (slot: string) =>
    banners.find((item) => item.slot === slot && item.active) ?? null;
  const topBanner = activeBanner("home_top");
  const middleBanner = activeBanner("home_middle");
  // Al buscar, la barra se queda pegada bajo el header y los resultados debajo.
  const dim = focused || query.trim().length > 0;

  return (
    <div className="space-y-5">
      {topBanner && !dim && <HomeBanner banner={topBanner} />}

      <div
        ref={searchRef}
        className={
          dim
            ? "sticky top-14 z-10 -mx-4 border-b border-brand-100 bg-white/90 px-4 py-3 backdrop-blur"
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
              window.scrollTo({ top: 0 });
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

      {!dim && (
        <FilterBar
          countries={countries}
          categories={categories}
          value={filters}
          onChange={update}
        />
      )}

      {error && <p className="card p-4 text-sm text-brand-700">{error}</p>}

      {!loading && listings.length === 0 && !error && (
        <p className="card p-6 text-center text-sm text-neutral-600">
          No hay publicaciones con esos filtros. Prueba con otra combinación o{" "}
          <button
            type="button"
            className="font-semibold text-brand-700 underline"
            onClick={() => navigate("/")}
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
            onClick={() => goToPage(page - 1)}
          >
            Anterior
          </button>
          <span className="text-sm text-neutral-600">
            {page} de {pages}
          </span>
          <button
            className="btn-ghost"
            disabled={page >= pages}
            onClick={() => goToPage(page + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
