import { ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { api, mediaUrl } from "../lib/api";
import type { Category, Country, Filter, Listing, MediaItem, Spec } from "../lib/types";

const PLANS: { value: string; label: string }[] = [
  { value: "free", label: "Gratis" },
  { value: "featured", label: "Destacado" },
  { value: "top", label: "TOP" },
];

interface FormState {
  title: string;
  display_name: string;
  description: string;
  contact_channel: string;
  contact_value: string;
  telegram: string;
  phone: string;
  category_id: string;
  country_id: string;
  city_id: string;
  zone_id: string;
  plan: string;
  plan_days: string;
  active: boolean;
  verified: boolean;
  specs: Spec[];
  media: MediaItem[];
  filterValues: Record<number, string>;
}

const EMPTY: FormState = {
  title: "",
  display_name: "",
  description: "",
  contact_channel: "whatsapp",
  contact_value: "",
  telegram: "",
  phone: "",
  category_id: "",
  country_id: "",
  city_id: "",
  zone_id: "",
  plan: "free",
  plan_days: "30",
  active: true,
  verified: false,
  specs: [{ label: "", value: "" }],
  media: [],
  filterValues: {},
};

function fromListing(listing: Listing): FormState {
  return {
    title: listing.title,
    display_name: listing.display_name,
    description: listing.description,
    contact_channel: listing.contact_channel,
    contact_value:
      (listing.contact_channel === "instagram"
        ? listing.seller.instagram
        : listing.seller.whatsapp) ?? "",
    telegram: listing.seller.telegram ?? "",
    phone: listing.seller.phone ?? "",
    category_id: String(listing.category_id),
    country_id: String(listing.country.id),
    city_id: listing.city ? String(listing.city.id) : "",
    zone_id: listing.zone ? String(listing.zone.id) : "",
    plan: listing.plan,
    plan_days: "30",
    active: listing.active,
    verified: listing.verified,
    specs:
      listing.specs.length > 0
        ? listing.specs.map((spec) => ({ label: spec.label, value: spec.value }))
        : [{ label: "", value: "" }],
    media: listing.media.map((item, index) => ({
      kind: item.kind,
      url: item.url,
      position: index,
    })),
    filterValues: Object.fromEntries(
      listing.filters.map((item) => [item.filter_id, String(item.option_id)]),
    ),
  };
}

function ListingForm({
  listing,
  categories,
  countries,
  onDone,
  onCancel,
}: {
  listing: Listing | null;
  categories: Category[];
  countries: Country[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    listing ? fromListing(listing) : EMPTY,
  );
  const [filters, setFilters] = useState<Filter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const category = categories.find((item) => String(item.id) === form.category_id);
  const country = countries.find((item) => String(item.id) === form.country_id);
  const cities = country?.cities ?? [];
  const city = cities.find((item) => String(item.id) === form.city_id);
  const zones = city?.zones ?? [];
  const images = form.media.filter((item) => item.kind === "image");
  const video = form.media.find((item) => item.kind === "video");

  useEffect(() => {
    api
      .filters(category?.slug)
      .then(setFilters)
      .catch(() => setFilters([]));
  }, [category?.slug]);

  function upload(files: File[], kind: "image" | "video") {
    if (files.length === 0) return;
    setBusy(kind === "image" ? "Subiendo fotos…" : "Subiendo video…");
    api
      .upload(files)
      .then((uploaded) =>
        setForm((current) => {
          const kept =
            kind === "video"
              ? current.media.filter((item) => item.kind !== "video")
              : current.media;
          return {
            ...current,
            media: [...kept, ...uploaded.map((item) => ({ ...item, position: 0 }))],
          };
        }),
      )
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : "No pudimos subir"),
      )
      .finally(() => setBusy(null));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy("Guardando…");
    const body = {
      title: form.title,
      display_name: form.display_name.trim(),
      description: form.description,
      contact_channel: form.contact_channel,
      contact_value: form.contact_value.trim(),
      telegram: form.telegram.trim(),
      phone: form.phone.trim(),
      category_id: Number(form.category_id),
      country_id: Number(form.country_id),
      city_id: form.city_id ? Number(form.city_id) : null,
      zone_id: form.zone_id ? Number(form.zone_id) : null,
      plan: form.plan,
      plan_days: Number(form.plan_days) || 30,
      active: form.active,
      verified: form.verified,
      // Reordena para que las fotos salgan en el mismo orden de la lista.
      media: form.media.map((item, index) => ({
        kind: item.kind,
        url: item.url,
        position: index,
      })),
      specs: form.specs.filter((spec) => spec.label.trim() && spec.value.trim()),
      filter_values: Object.fromEntries(
        Object.entries(form.filterValues)
          .filter(([, value]) => value)
          .map(([filterId, optionId]) => [Number(filterId), Number(optionId)]),
      ),
    };
    try {
      if (listing) await api.admin.updateListing(listing.id, body);
      else await api.admin.createListing(body);
      onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos guardar");
    } finally {
      setBusy(null);
    }
  }

  return (
    <form className="card space-y-4 p-4" onSubmit={submit}>
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-brand-800">
          {listing ? `Editar “${listing.title}”` : "Nuevo anuncio"}
        </h3>
        <button type="button" className="btn-ghost ml-auto px-2 py-1 text-xs" onClick={onCancel}>
          <X size={14} /> Cerrar
        </button>
      </div>

      <label className="block">
        <span className="label">Título</span>
        <input
          className="input"
          minLength={3}
          maxLength={120}
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          required
        />
      </label>
      <label className="block">
        <span className="label">Nombre (se muestra sobre la foto)</span>
        <input
          className="input"
          maxLength={60}
          value={form.display_name}
          onChange={(event) => setForm({ ...form, display_name: event.target.value })}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.verified}
          onChange={(event) => setForm({ ...form, verified: event.target.checked })}
        />
        Mostrar el chulo de verificado junto al nombre
      </label>
      <label className="block">
        <span className="label">Descripción</span>
        <textarea
          className="input min-h-32"
          minLength={20}
          maxLength={5000}
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          required
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="label">Canal de contacto</span>
          <select
            className="filter-btn"
            value={form.contact_channel}
            onChange={(event) => setForm({ ...form, contact_channel: event.target.value })}
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
          </select>
        </label>
        <label className="block">
          <span className="label">
            {form.contact_channel === "instagram" ? "Usuario de Instagram" : "Número de WhatsApp"}
          </span>
          <input
            className="input"
            placeholder={form.contact_channel === "instagram" ? "tienda.movil" : "+573001112233"}
            value={form.contact_value}
            onChange={(event) => setForm({ ...form, contact_value: event.target.value })}
            required
          />
        </label>
        <label className="block">
          <span className="label">Tipo</span>
          <select
            className="filter-btn"
            value={form.category_id}
            onChange={(event) => setForm({ ...form, category_id: event.target.value })}
            required
          >
            <option value="">Elige el tipo</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Telegram (opcional)</span>
          <input
            className="input"
            placeholder="usuario o +573001112233"
            value={form.telegram}
            onChange={(event) => setForm({ ...form, telegram: event.target.value })}
          />
        </label>
        <label className="block">
          <span className="label">Teléfono para llamadas (opcional)</span>
          <input
            className="input"
            placeholder="+573001112233"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
        </label>
        <p className="text-xs text-neutral-500 sm:col-span-2">
          Si los dejas vacíos se usa el número de WhatsApp.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="label">País</span>
          <select
            className="filter-btn"
            value={form.country_id}
            onChange={(event) =>
              setForm({ ...form, country_id: event.target.value, city_id: "", zone_id: "" })
            }
            required
          >
            <option value="">Elige el país</option>
            {countries.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Ciudad</span>
          <select
            className="filter-btn"
            value={form.city_id}
            disabled={!country}
            onChange={(event) =>
              setForm({ ...form, city_id: event.target.value, zone_id: "" })
            }
          >
            <option value="">Sin ciudad</option>
            {cities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Zona</span>
          <select
            className="filter-btn"
            value={form.zone_id}
            disabled={!city}
            onChange={(event) => setForm({ ...form, zone_id: event.target.value })}
          >
            <option value="">Sin zona</option>
            {zones.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <span className="label">Fotos (mínimo 3) y un video opcional</span>
        <div className="flex flex-wrap gap-2">
          {form.media.map((item, index) => (
            <div key={`${item.url}-${index}`} className="relative">
              {item.kind === "image" ? (
                <img
                  src={mediaUrl(item.url)}
                  alt=""
                  className="h-20 w-20 rounded-lg bg-neutral-100 object-contain"
                />
              ) : (
                <video
                  src={mediaUrl(item.url)}
                  className="h-20 w-20 rounded-lg bg-neutral-100 object-contain"
                  muted
                />
              )}
              <button
                type="button"
                className="absolute -right-1 -top-1 rounded-full bg-white p-1 shadow"
                title="Quitar"
                onClick={() =>
                  setForm({
                    ...form,
                    media: form.media.filter((_, position) => position !== index),
                  })
                }
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="btn-ghost cursor-pointer">
            <ImagePlus size={16} /> Agregar fotos
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                upload(Array.from(event.target.files ?? []), "image");
                event.target.value = "";
              }}
            />
          </label>
          <label className="btn-ghost cursor-pointer">
            {video ? "Cambiar video" : "Agregar video"}
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) upload([file], "video");
                event.target.value = "";
              }}
            />
          </label>
        </div>
        <p className="text-xs text-neutral-500">
          {images.length} foto(s){video ? " y 1 video" : ""} · 1600×1200 px recomendado
        </p>
      </div>

      <div className="space-y-2">
        <span className="label">Tabla de detalles (ej. Usado: Sí)</span>
        {form.specs.map((spec, index) => (
          <div key={index} className="flex gap-2">
            <input
              className="input"
              placeholder="Etiqueta"
              value={spec.label}
              onChange={(event) =>
                setForm({
                  ...form,
                  specs: form.specs.map((item, position) =>
                    position === index ? { ...item, label: event.target.value } : item,
                  ),
                })
              }
            />
            <input
              className="input"
              placeholder="Valor"
              value={spec.value}
              onChange={(event) =>
                setForm({
                  ...form,
                  specs: form.specs.map((item, position) =>
                    position === index ? { ...item, value: event.target.value } : item,
                  ),
                })
              }
            />
            <button
              type="button"
              className="btn-ghost"
              onClick={() =>
                setForm({
                  ...form,
                  specs: form.specs.filter((_, position) => position !== index),
                })
              }
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setForm({ ...form, specs: [...form.specs, { label: "", value: "" }] })}
        >
          <Plus size={16} /> Agregar fila
        </button>
      </div>

      {filters.length > 0 && (
        <div className="space-y-2">
          <span className="label">Características</span>
          <div className="grid gap-3 sm:grid-cols-2">
            {filters.map((filter) => (
              <label key={filter.id} className="block">
                <span className="text-xs text-neutral-500">{filter.name}</span>
                <select
                  className="filter-btn"
                  value={form.filterValues[filter.id] ?? ""}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      filterValues: {
                        ...form.filterValues,
                        [filter.id]: event.target.value,
                      },
                    })
                  }
                >
                  <option value="">Sin especificar</option>
                  {filter.options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="label">Posicionamiento</span>
          <select
            className="filter-btn"
            value={form.plan}
            onChange={(event) => setForm({ ...form, plan: event.target.value })}
          >
            {PLANS.map((plan) => (
              <option key={plan.value} value={plan.value}>
                {plan.label}
              </option>
            ))}
          </select>
        </label>
        {form.plan !== "free" && (
          <label className="block">
            <span className="label">Días del plan</span>
            <input
              className="input"
              type="number"
              min={1}
              max={365}
              value={form.plan_days}
              onChange={(event) => setForm({ ...form, plan_days: event.target.value })}
            />
          </label>
        )}
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm({ ...form, active: event.target.checked })}
          />
          Activo (visible en la web)
        </label>
      </div>

      {error && <p className="text-sm text-brand-700">{error}</p>}
      <button className="btn-primary" disabled={Boolean(busy)}>
        {busy ?? (listing ? "Guardar cambios" : "Publicar anuncio")}
      </button>
    </form>
  );
}

export default function AdminListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [editing, setEditing] = useState<Listing | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.admin
      .listings(new URLSearchParams({ limit: "200", sort: "recent" }))
      .then((page) => setListings(page.items))
      .catch(() => setError("No pudimos cargar los anuncios"));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    Promise.all([api.admin.categories(), api.admin.countries()])
      .then(([categoryList, countryList]) => {
        setCategories(categoryList);
        setCountries(countryList);
      })
      .catch(() => setError("No pudimos cargar los tipos o países"));
  }, []);

  function run(promise: Promise<unknown>) {
    promise
      .then(load)
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : "Ocurrió un error"),
      );
  }

  return (
    <div className="space-y-3">
      {!creating && !editing && (
        <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> Crear anuncio
        </button>
      )}
      {error && <p className="text-sm text-brand-700">{error}</p>}

      {(creating || editing) && (
        <ListingForm
          key={editing?.id ?? "nuevo"}
          listing={editing}
          categories={categories}
          countries={countries}
          onDone={() => {
            setCreating(false);
            setEditing(null);
            setError(null);
            load();
          }}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      <div className="space-y-2">
        {listings.map((listing) => (
          <div key={listing.id} className="card flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{listing.title}</p>
              <p className="text-xs text-neutral-500">
                {listing.plan_label} · {listing.status_label} ·{" "}
                {listing.active ? "Activo" : "Desactivado"} · {listing.category.name} ·{" "}
                {[listing.zone?.name, listing.city?.name, listing.country.name]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p className="text-xs text-neutral-400">
                Usuario: {listing.seller.public_id} · {listing.seller.name} ·{" "}
                {listing.contact_label}
              </p>
            </div>
            <select
              className="filter-btn w-auto text-xs"
              value={listing.plan}
              onChange={(event) =>
                run(
                  api.admin.updateListing(listing.id, {
                    plan: event.target.value,
                    plan_days: 30,
                  }),
                )
              }
            >
              {PLANS.map((plan) => (
                <option key={plan.value} value={plan.value}>
                  {plan.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-ghost px-3 py-1 text-xs"
              onClick={() =>
                run(api.admin.updateListing(listing.id, { active: !listing.active }))
              }
            >
              {listing.active ? "Desactivar" : "Activar"}
            </button>
            <button
              type="button"
              className="btn-ghost px-3 py-1 text-xs"
              onClick={() => {
                setCreating(false);
                setEditing(listing);
              }}
            >
              <Pencil size={14} /> Editar
            </button>
            <button
              type="button"
              className="btn-ghost px-3 py-1 text-xs"
              onClick={() => {
                if (!window.confirm(`¿Eliminar "${listing.title}" definitivamente?`)) return;
                run(api.admin.deleteListing(listing.id));
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {listings.length === 0 && (
          <p className="card p-4 text-sm text-neutral-600">Todavía no hay anuncios.</p>
        )}
      </div>
    </div>
  );
}
