import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import ContactButton from "../components/ContactButton";
import LocationMap from "../components/LocationMap";
import VerifiedBadge from "../components/VerifiedBadge";
import { api, mediaUrl } from "../lib/api";
import type { Listing } from "../lib/types";

export default function ListingDetail() {
  const { id } = useParams();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!id) return;
    api
      .listing(Number(id))
      .then(setListing)
      .catch(() => setError("No encontramos esta publicación"));
  }, [id]);

  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-brand-700">{error}</p>
        <Link to="/" className="btn-ghost mt-3">
          <ArrowLeft size={16} /> Volver al inicio
        </Link>
      </div>
    );
  }

  if (!listing) return <p className="text-sm text-neutral-600">Cargando…</p>;

  const images = listing.media.filter((item) => item.kind === "image");
  const video = listing.media.find((item) => item.kind === "video");
  const cover = images[active] ?? images[0];
  const place = [listing.zone?.name, listing.city?.name, listing.country.name]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-4">
        <div className="card overflow-hidden">
          <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
            {cover && (
              <>
                <img
                  src={mediaUrl(cover.url)}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
                />
                <img
                  src={mediaUrl(cover.url)}
                  alt={listing.title}
                  className="relative h-full w-full object-contain"
                />
              </>
            )}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Foto anterior"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-white/20 p-2.5 text-white shadow-lg backdrop-blur-md transition hover:bg-white/35"
                  onClick={() =>
                    setActive((current) => (current - 1 + images.length) % images.length)
                  }
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  aria-label="Foto siguiente"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/30 bg-white/20 p-2.5 text-white shadow-lg backdrop-blur-md transition hover:bg-white/35"
                  onClick={() => setActive((current) => (current + 1) % images.length)}
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
            {listing.display_name && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-4 pb-3 pt-10">
                <p className="flex items-center gap-1.5 font-display text-2xl font-bold italic tracking-wide text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] sm:text-3xl">
                  {listing.display_name}
                  {listing.verified && (
                    <VerifiedBadge className="h-6 w-6 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] sm:h-7 sm:w-7" />
                  )}
                </p>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {images.map((image, index) => (
                <button
                  key={image.url}
                  type="button"
                  onClick={() => setActive(index)}
                  className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                    index === active ? "border-brand-600" : "border-transparent"
                  }`}
                >
                  <img
                    src={mediaUrl(image.url)}
                    alt=""
                    className="h-full w-full bg-neutral-100 object-contain"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {video && (
          <div className="card overflow-hidden">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={mediaUrl(video.url)} controls className="w-full" />
          </div>
        )}

        {listing.specs.length > 0 && (
          <div className="card overflow-hidden">
            <h2 className="border-b border-neutral-200 px-4 py-3 font-semibold">
              Detalles
            </h2>
            <table className="w-full text-sm">
              <tbody>
                {listing.specs.map((spec) => (
                  <tr key={`${spec.label}-${spec.value}`} className="border-b last:border-0">
                    <th className="w-1/3 bg-brand-50 px-4 py-2 text-left font-medium text-neutral-700">
                      {spec.label}
                    </th>
                    <td className="px-4 py-2">{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card flex items-stretch gap-3 p-4">
          <div className="min-w-0 flex-1">
            <h1 className="mb-2 text-lg font-bold">{listing.title}</h1>
            <p className="whitespace-pre-line text-sm text-neutral-700">
              {listing.description}
            </p>
          </div>
          <ContactButton listing={listing} />
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="card space-y-3 p-4">
          <p className="text-sm text-neutral-600">{place}</p>
          <LocationMap place={place} />
        </div>

        {listing.filters.length > 0 && (
          <div className="card p-4 text-sm">
            <h2 className="mb-2 font-semibold">Características</h2>
            <ul className="space-y-1 text-neutral-700">
              {listing.filters.map((value) => (
                <li key={value.filter_id}>
                  <span className="text-neutral-500">{value.filter_name}: </span>
                  {value.option_name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
