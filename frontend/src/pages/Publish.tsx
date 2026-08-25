import { Clock, ImagePlus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../lib/api";
import { useSession } from "../lib/session";
import type {
  Category,
  Country,
  Filter,
  ListingSubmitted,
  MediaLimits,
  Spec,
} from "../lib/types";

interface FormState {
  title: string;
  description: string;
  category_id: string;
  country_id: string;
  city_id: string;
  zone_id: string;
}

const EMPTY: FormState = {
  title: "",
  description: "",
  category_id: "",
  country_id: "",
  city_id: "",
  zone_id: "",
};

export default function Publish() {
  const { seller, loading } = useSession();
  const navigate = useNavigate();
  const [limits, setLimits] = useState<MediaLimits | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [filterValues, setFilterValues] = useState<Record<number, string>>({});
  const [form, setForm] = useState<FormState>(EMPTY);
  const [specs, setSpecs] = useState<Spec[]>([{ label: "", value: "" }]);
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState<ListingSubmitted | null>(null);

  useEffect(() => {
    if (!loading && !seller) navigate("/ingresar");
  }, [loading, seller, navigate]);

  useEffect(() => {
    Promise.all([api.config(), api.categories(), api.countries()])
      .then(([config, categoryList, countryList]) => {
        setLimits(config);
        setCategories(categoryList);
        setCountries(countryList);
      })
      .catch(() => setError("No pudimos cargar el formulario"));
  }, []);

  const category = categories.find((item) => String(item.id) === form.category_id);

  useEffect(() => {
    api
      .filters(category?.slug)
      .then(setFilters)
      .catch(() => setFilters([]));
  }, [category?.slug]);

  const country = countries.find((item) => String(item.id) === form.country_id);
  const cities = country?.cities ?? [];
  const city = cities.find((item) => String(item.id) === form.city_id);
  const zones = city?.zones ?? [];
  const minImages = limits?.min_images ?? 3;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (images.length < minImages) {
      setError(`Sube al menos ${minImages} fotos`);
      return;
    }
    setSaving(true);
    try {
      const uploaded = await api.upload(video ? [...images, video] : images);
      const result = await api.createListing({
        title: form.title,
        description: form.description,
        category_id: Number(form.category_id),
        country_id: Number(form.country_id),
        city_id: form.city_id ? Number(form.city_id) : null,
        zone_id: form.zone_id ? Number(form.zone_id) : null,
        media: uploaded.map((item, index) => ({
          kind: item.kind,
          url: item.url,
          position: index,
        })),
        specs: specs.filter((spec) => spec.label.trim() && spec.value.trim()),
        filter_values: Object.fromEntries(
          Object.entries(filterValues)
            .filter(([, value]) => value)
            .map(([filterId, optionId]) => [Number(filterId), Number(optionId)]),
        ),
      });
      setSubmitted(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos publicar");
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <div className="card mx-auto max-w-lg space-y-3 p-6 text-center">
        <Clock className="mx-auto text-brand-600" size={32} />
        <h1 className="text-xl font-bold text-brand-700">Anuncio en verificación</h1>
        <p className="text-sm text-neutral-700">{submitted.message}</p>
        <p className="text-sm text-neutral-500">
          Tiempo estimado: entre {submitted.review_min_days} y{" "}
          {submitted.review_max_days} días.
        </p>
        <div className="flex justify-center gap-2">
          <Link to="/mi-cuenta" className="btn-primary">
            Ver mis anuncios
          </Link>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setSubmitted(null);
              setForm(EMPTY);
              setSpecs([{ label: "", value: "" }]);
              setImages([]);
              setVideo(null);
              setFilterValues({});
            }}
          >
            Publicar otro
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold text-brand-700">Publicar anuncio</h1>

      <section className="card space-y-3 p-4">
        <div>
          <label className="label" htmlFor="title">
            Título
          </label>
          <input
            id="title"
            className="input"
            minLength={3}
            maxLength={120}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="description">
            Descripción
          </label>
          <textarea
            id="description"
            className="input min-h-32"
            minLength={20}
            maxLength={5000}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            required
          />
        </div>
        <div className="grid gap-3">
          <div>
            <label className="label" htmlFor="category">
              Tipo
            </label>
            <select
              id="category"
              className="filter-btn"
              value={form.category_id}
              onChange={(event) =>
                setForm({ ...form, category_id: event.target.value })
              }
              required
            >
              <option value="">Elige el tipo</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">¿Dónde se ubica?</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="country">
              País
            </label>
            <select
              id="country"
              className="filter-btn"
              value={form.country_id}
              onChange={(event) =>
                setForm({
                  ...form,
                  country_id: event.target.value,
                  city_id: "",
                  zone_id: "",
                })
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
          </div>
          <div>
            <label className="label" htmlFor="city">
              Ciudad
            </label>
            <select
              id="city"
              className="filter-btn"
              value={form.city_id}
              disabled={!country}
              onChange={(event) =>
                setForm({ ...form, city_id: event.target.value, zone_id: "" })
              }
            >
              <option value="">Elige la ciudad</option>
              {cities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="zone">
              Zona
            </label>
            <select
              id="zone"
              className="filter-btn"
              value={form.zone_id}
              disabled={!city}
              onChange={(event) => setForm({ ...form, zone_id: event.target.value })}
            >
              <option value="">Elige la zona</option>
              {zones.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">
          Fotos y video{" "}
          <span className="text-sm font-normal text-neutral-500">
            (mínimo {minImages} fotos, {limits?.max_videos ?? 1} video opcional)
          </span>
        </h2>
        <label className="btn-ghost cursor-pointer">
          <ImagePlus size={16} /> Elegir fotos
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) =>
              setImages(Array.from(event.target.files ?? []).slice(0, limits?.max_images ?? 10))
            }
          />
        </label>
        <p className="text-xs text-neutral-500">{images.length} fotos seleccionadas</p>
        <label className="btn-ghost cursor-pointer">
          Elegir video
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(event) => setVideo(event.target.files?.[0] ?? null)}
          />
        </label>
        {video && <p className="text-xs text-neutral-500">{video.name}</p>}
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">
          Tabla de detalles{" "}
          <span className="text-sm font-normal text-neutral-500">
            (ej. Usado: Sí · Hecho en: Italia)
          </span>
        </h2>
        {specs.map((spec, index) => (
          <div key={index} className="flex gap-2">
            <input
              className="input"
              placeholder="Etiqueta"
              value={spec.label}
              onChange={(event) =>
                setSpecs(
                  specs.map((item, position) =>
                    position === index ? { ...item, label: event.target.value } : item,
                  ),
                )
              }
            />
            <input
              className="input"
              placeholder="Valor"
              value={spec.value}
              onChange={(event) =>
                setSpecs(
                  specs.map((item, position) =>
                    position === index ? { ...item, value: event.target.value } : item,
                  ),
                )
              }
            />
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setSpecs(specs.filter((_, position) => position !== index))}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setSpecs([...specs, { label: "", value: "" }])}
        >
          <Plus size={16} /> Agregar fila
        </button>
      </section>

      {filters.length > 0 && (
        <section className="card space-y-3 p-4">
          <h2 className="font-semibold">Características</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {filters.map((filter) => (
              <div key={filter.id}>
                <span className="label">{filter.name}</span>
                <select
                  className="filter-btn"
                  value={filterValues[filter.id] ?? ""}
                  onChange={(event) =>
                    setFilterValues({ ...filterValues, [filter.id]: event.target.value })
                  }
                >
                  <option value="">Sin especificar</option>
                  {filter.options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      )}

      {error && <p className="card p-3 text-sm text-brand-700">{error}</p>}

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={saving}>
          {saving ? "Enviando…" : "Enviar a verificación"}
        </button>
        <p className="text-xs text-neutral-500">
          La verificación tarda entre 1 y 3 días.
        </p>
      </div>
    </form>
  );
}
