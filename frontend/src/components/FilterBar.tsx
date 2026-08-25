import { RotateCcw } from "lucide-react";
import { useState } from "react";

import { EMPTY_FILTERS, type FilterState } from "../lib/filters";
import type { Category, Country } from "../lib/types";

interface Props {
  countries: Country[];
  categories: Category[];
  value: FilterState;
  onChange: (value: FilterState) => void;
}

interface Option {
  slug: string;
  name: string;
}

function Combo({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState<string | null>(null);
  const selected = options.find((option) => option.slug === value);
  const text = query ?? selected?.name ?? "";
  // Al abrir el campo queda vacío y con la lista completa; al escribir se filtra.
  const needle = (query ?? "").trim().toLowerCase();
  const matches = options.filter((option) => option.name.toLowerCase().includes(needle));

  function pick(option: Option | null) {
    onChange(option?.slug ?? "");
    setQuery(null);
  }

  return (
    <div
      className="relative min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setQuery(null);
        }
      }}
    >
      <span className="label text-xs">{label}</span>
      <input
        className="filter-btn w-full truncate px-2 py-1.5 text-[16px] sm:text-xs"
        placeholder={disabled ? "—" : (selected?.name ?? "Todas")}
        disabled={disabled}
        value={text}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setQuery("")}
      />
      {query !== null && !disabled && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-white/40 bg-white/70 py-1 shadow-xl backdrop-blur-md">
          <li>
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left text-xs text-neutral-500 hover:bg-brand-50"
              onClick={() => pick(null)}
            >
              Todas
            </button>
          </li>
          {matches.map((option) => (
            <li key={option.slug}>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-xs hover:bg-brand-50"
                onClick={() => pick(option)}
              >
                {option.name}
              </button>
            </li>
          ))}
          {matches.length === 0 && (
            <li className="px-3 py-1.5 text-xs text-neutral-500">Sin resultados</li>
          )}
        </ul>
      )}
    </div>
  );
}

export default function FilterBar({ countries, categories, value, onChange }: Props) {
  const country = countries.find((item) => item.slug === value.country);
  const cities = country?.cities ?? [];
  const city = cities.find((item) => item.slug === value.city);
  const zones = city?.zones ?? [];

  return (
    <div className="card p-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Combo
          label="País"
          value={value.country}
          options={countries}
          onChange={(country) => onChange({ ...value, country, city: "", zone: "" })}
        />
        <Combo
          label="Ciudad"
          value={value.city}
          options={cities}
          disabled={!country}
          onChange={(city) => onChange({ ...value, city, zone: "" })}
        />
        <Combo
          label="Zona"
          value={value.zone}
          options={zones}
          disabled={!city}
          onChange={(zone) => onChange({ ...value, zone })}
        />
        <Combo
          label="Tipo"
          value={value.category}
          options={categories}
          onChange={(category) => onChange({ ...value, category })}
        />
      </div>
      {(value.country || value.city || value.zone || value.category) && (
        <button
          type="button"
          className="btn-ghost mt-3"
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          <RotateCcw size={14} /> Limpiar filtros
        </button>
      )}
    </div>
  );
}
