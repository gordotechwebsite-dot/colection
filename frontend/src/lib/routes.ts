import type { FilterState } from "./filters";

/** Ruta de la portada filtrada: /pais/ciudad/zona (cada nivel es opcional). */
export function locationPath(filters: Pick<FilterState, "country" | "city" | "zone">) {
  const parts: string[] = [];
  if (filters.country) parts.push(filters.country);
  if (filters.country && filters.city) parts.push(filters.city);
  if (filters.country && filters.city && filters.zone) parts.push(filters.zone);
  return parts.length ? `/${parts.join("/")}` : "/";
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Ruta del anuncio con su título en la URL para que Google la lea mejor. */
export function listingPath(id: number, title: string) {
  return `/anuncio/${id}/${slugify(title) || "sin-nombre"}`;
}
