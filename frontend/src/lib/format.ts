import type { Listing } from "./types";

export function formatPrice(listing: Listing): string {
  if (listing.price === null) return "Precio a convenir";
  return `${listing.currency} ${listing.price.toLocaleString("es-CO")}`;
}
