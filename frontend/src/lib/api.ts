import type {
  AdminStats,
  AuthOut,
  Category,
  Country,
  Filter,
  Listing,
  ListingPage,
  ListingSubmitted,
  MediaLimits,
  SellerAccount,
  UploadedMedia,
  Zone,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const TOKEN_KEY = "redbook_token";
export const ADMIN_TOKEN_KEY = "redbook_admin_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function mediaUrl(url: string): string {
  return url.startsWith("http") ? url : `${API_URL}${url}`;
}

type Options = {
  method?: string;
  body?: unknown;
  admin?: boolean;
  formData?: FormData;
};

function errorMessage(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | undefined;
    if (first?.msg) return first.msg.replace(/^Value error, /, "");
  }
  return "Ocurrió un error, inténtalo de nuevo";
}

export async function request<T>(path: string, options: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.admin) {
    const adminToken = getAdminToken();
    if (adminToken) headers["X-Admin-Token"] = adminToken;
  }
  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? (body ? "POST" : "GET"),
    headers,
    body,
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(errorMessage((data as { detail?: unknown })?.detail));
  }
  return data as T;
}

export const api = {
  config: () => request<MediaLimits>("/api/config"),
  categories: () => request<Category[]>("/api/categories"),
  countries: () => request<Country[]>("/api/countries"),
  filters: (category?: string) =>
    request<Filter[]>(`/api/filters${category ? `?category=${category}` : ""}`),
  listings: (params: URLSearchParams) =>
    request<ListingPage>(`/api/listings?${params.toString()}`),
  listing: (id: number) => request<Listing>(`/api/listings/${id}`),
  contact: (id: number) =>
    request<Listing>(`/api/listings/${id}/contact`, { method: "POST" }),
  bump: (id: number) =>
    request<Listing>(`/api/listings/${id}/bump`, { method: "POST" }),
  promote: (id: number, plan: string, days: number) =>
    request<Listing>(`/api/listings/${id}/promote`, { body: { plan, days } }),
  upload: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    return request<UploadedMedia[]>("/api/uploads", { formData });
  },
  createListing: (body: unknown) =>
    request<ListingSubmitted>("/api/listings", { body }),

  register: (body: unknown) => request<AuthOut>("/api/sellers/register", { body }),
  login: (body: unknown) => request<AuthOut>("/api/sellers/login", { body }),
  me: () => request<SellerAccount>("/api/sellers/me"),
  updateMe: (body: unknown) =>
    request<SellerAccount>("/api/sellers/me", { method: "PATCH", body }),
  myListings: () => request<Listing[]>("/api/sellers/me/listings"),

  admin: {
    session: () => request<{ ok: boolean }>("/api/admin/session", { admin: true }),
    stats: () => request<AdminStats>("/api/admin/stats", { admin: true }),
    listings: (params: URLSearchParams) =>
      request<ListingPage>(`/api/admin/listings?${params.toString()}`, {
        admin: true,
      }),
    review: (id: number, status: "approved" | "rejected", reason?: string) =>
      request<Listing>(`/api/admin/listings/${id}/review`, {
        admin: true,
        body: { status, rejection_reason: reason },
      }),
    updateListing: (id: number, body: unknown) =>
      request<Listing>(`/api/admin/listings/${id}`, {
        admin: true,
        method: "PATCH",
        body,
      }),
    deleteListing: (id: number) =>
      request<void>(`/api/admin/listings/${id}`, {
        admin: true,
        method: "DELETE",
      }),
    sellers: () => request<SellerAccount[]>("/api/admin/sellers", { admin: true }),

    countries: () => request<Country[]>("/api/admin/countries", { admin: true }),
    createCountry: (body: unknown) =>
      request<Country>("/api/admin/countries", { admin: true, body }),
    deleteCountry: (id: number) =>
      request<void>(`/api/admin/countries/${id}`, {
        admin: true,
        method: "DELETE",
      }),
    createCity: (countryId: number, body: unknown) =>
      request<Country>(`/api/admin/countries/${countryId}/cities`, {
        admin: true,
        body,
      }),
    deleteCity: (id: number) =>
      request<void>(`/api/admin/cities/${id}`, { admin: true, method: "DELETE" }),
    createZone: (cityId: number, body: unknown) =>
      request<Zone>(`/api/admin/cities/${cityId}/zones`, { admin: true, body }),
    deleteZone: (id: number) =>
      request<void>(`/api/admin/zones/${id}`, { admin: true, method: "DELETE" }),

    categories: () => request<Category[]>("/api/admin/categories", { admin: true }),
    createCategory: (body: unknown) =>
      request<Category>("/api/admin/categories", { admin: true, body }),
    deleteCategory: (id: number) =>
      request<void>(`/api/admin/categories/${id}`, {
        admin: true,
        method: "DELETE",
      }),

    filters: () => request<Filter[]>("/api/admin/filters", { admin: true }),
    createFilter: (body: unknown) =>
      request<Filter>("/api/admin/filters", { admin: true, body }),
    deleteFilter: (id: number) =>
      request<void>(`/api/admin/filters/${id}`, { admin: true, method: "DELETE" }),
  },
};
