import { RotateCcw } from "lucide-react";

import { EMPTY_FILTERS, type FilterState } from "../lib/filters";
import type { Category, Country } from "../lib/types";

interface Props {
  countries: Country[];
  categories: Category[];
  value: FilterState;
  onChange: (value: FilterState) => void;
}

function Select({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: { slug: string; name: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="label text-xs">{label}</span>
      <select
        className={`filter-btn truncate px-2 py-1.5 text-xs ${value ? "filter-btn-active" : ""}`}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{disabled ? "—" : "Todas"}</option>
        {options.map((option) => (
          <option key={option.slug} value={option.slug}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
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
        <Select
          label="País"
          value={value.country}
          options={countries}
          onChange={(country) => onChange({ ...value, country, city: "", zone: "" })}
        />
        <Select
          label="Ciudad"
          value={value.city}
          options={cities}
          disabled={!country}
          onChange={(city) => onChange({ ...value, city, zone: "" })}
        />
        <Select
          label="Zona"
          value={value.zone}
          options={zones}
          disabled={!city}
          onChange={(zone) => onChange({ ...value, zone })}
        />
        <Select
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
