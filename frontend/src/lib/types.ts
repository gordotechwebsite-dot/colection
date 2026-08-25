export type ContactChannel = "whatsapp" | "instagram";

export interface Category {
  id: number;
  slug: string;
  name: string;
  icon?: string | null;
  active: boolean;
}

export interface Zone {
  id: number;
  slug: string;
  name: string;
  city_id: number;
  active: boolean;
}

export interface City {
  id: number;
  slug: string;
  name: string;
  country_id: number;
  active: boolean;
  zones: Zone[];
}

export interface Country {
  id: number;
  slug: string;
  name: string;
  code?: string | null;
  currency?: string | null;
  active: boolean;
  cities: City[];
}

export interface FilterOption {
  id: number;
  slug: string;
  name: string;
  position: number;
}

export interface Filter {
  id: number;
  slug: string;
  name: string;
  category_id: number | null;
  position: number;
  active: boolean;
  options: FilterOption[];
}

export interface MediaItem {
  id?: number;
  kind: "image" | "video";
  url: string;
  position: number;
}

export interface Spec {
  id?: number;
  label: string;
  value: string;
  position?: number;
}

export interface Seller {
  id: number;
  public_id: string;
  name: string;
  contact_channel: ContactChannel;
  whatsapp?: string | null;
  instagram?: string | null;
  country?: Country | null;
  city?: City | null;
  created_at: string;
}

export interface SellerAccount extends Seller {
  email: string;
  active: boolean;
}

export interface ListingFilterValue {
  filter_id: number;
  filter_slug: string;
  filter_name: string;
  option_id: number;
  option_slug: string;
  option_name: string;
}

export type ListingStatus = "pending" | "approved" | "rejected";

export interface Listing {
  id: number;
  title: string;
  description: string;
  price: number | null;
  currency: string;
  category_id: number;
  category: Category;
  seller: Seller;
  country: Country;
  city?: City | null;
  zone?: Zone | null;
  media: MediaItem[];
  specs: Spec[];
  filters: ListingFilterValue[];
  plan: string;
  effective_plan: string;
  plan_label: string;
  plan_until: string | null;
  bumped_at: string;
  score: number;
  views: number;
  contact_clicks: number;
  active: boolean;
  status: ListingStatus;
  status_label: string;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  contact_channel: ContactChannel;
  contact_label: string;
  contact_url: string;
}

export interface ListingPage {
  items: Listing[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListingSubmitted {
  listing: Listing;
  review_min_days: number;
  review_max_days: number;
  message: string;
}

export interface MediaLimits {
  min_images: number;
  max_images: number;
  max_videos: number;
  max_image_mb: number;
  max_video_mb: number;
}

export interface AuthOut {
  token: string;
  seller: SellerAccount;
}

export interface UploadedMedia {
  kind: "image" | "video";
  url: string;
  filename: string;
}

export interface AdminStats {
  listings: number;
  active_listings: number;
  pending_listings: number;
  sellers: number;
  countries: number;
  cities: number;
  categories: number;
  filters: number;
  views: number;

  contact_clicks: number;
  by_plan: Record<string, number>;
}
