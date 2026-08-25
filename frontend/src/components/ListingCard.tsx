import { MapPin, Video } from "lucide-react";
import { Link } from "react-router-dom";

import { mediaUrl } from "../lib/api";
import type { Listing } from "../lib/types";

const PLAN_STYLES: Record<string, string> = {
  top: "bg-amber-400 text-amber-950",
  featured: "bg-purple-400 text-white",
  free: "hidden",
};

export default function ListingCard({ listing }: { listing: Listing }) {
  const cover = listing.media.find((item) => item.kind === "image");
  const hasVideo = listing.media.some((item) => item.kind === "video");

  return (
    <Link
      to={`/anuncio/${listing.id}`}
      className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
        {cover && (
          <>
            <img
              src={mediaUrl(cover.url)}
              alt=""
              aria-hidden
              loading="lazy"
              className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
            />
            <img
              src={mediaUrl(cover.url)}
              alt={listing.title}
              loading="lazy"
              className="relative h-full w-full object-contain transition group-hover:scale-105"
            />
          </>
        )}
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
            PLAN_STYLES[listing.effective_plan] ?? "hidden"
          }`}
        >
          {listing.plan_label}
        </span>
        {hasVideo && (
          <span className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white">
            <Video size={14} />
          </span>
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="line-clamp-2 text-sm font-semibold">{listing.title}</p>
        <p className="flex items-center gap-1 text-xs text-neutral-500">
          <MapPin size={12} />
          {listing.city ? `${listing.city.name}, ` : ""}
          {listing.country.name}
        </p>
      </div>
    </Link>
  );
}
