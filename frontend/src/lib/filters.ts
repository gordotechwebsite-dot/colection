export interface FilterState {
  country: string;
  city: string;
  zone: string;
  category: string;
}

export const EMPTY_FILTERS: FilterState = {
  country: "",
  city: "",
  zone: "",
  category: "",
};
