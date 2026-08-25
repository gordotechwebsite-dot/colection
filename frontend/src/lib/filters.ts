export interface FilterState {
  country: string;
  city: string;
  zone: string;
  category: string;
}

/** Ubicación con la que abre la portada cuando no hay filtros en la URL. */
export const DEFAULT_FILTERS: FilterState = {
  country: "espana",
  city: "barcelona",
  zone: "sagrada-familia",
  category: "",
};
