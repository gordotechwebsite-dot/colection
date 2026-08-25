import { Link } from "react-router-dom";

import { mediaUrl } from "../lib/api";
import type { Banner } from "../lib/types";

export default function HomeBanner({ banner }: { banner: Banner }) {
  const image = banner.image_url ? mediaUrl(banner.image_url) : null;
  const external = banner.link_url?.startsWith("http");

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-brand-100 bg-brand-600 bg-cover bg-center shadow-sm"
      style={image ? { backgroundImage: `url(${image})` } : undefined}
    >
      {image && <div className="absolute inset-0 bg-brand-900/55" />}
      <div className="relative px-5 py-10 text-center sm:py-14">
        {banner.title && (
          <h1 className="text-2xl font-black text-white sm:text-4xl">{banner.title}</h1>
        )}
        {banner.subtitle && (
          <p className="mx-auto mt-2 max-w-2xl text-sm text-white/90 sm:text-base">
            {banner.subtitle}
          </p>
        )}
        {banner.link_url && banner.link_label && (
          <div className="mt-5">
            {external ? (
              <a
                className="btn bg-white text-brand-700 hover:bg-brand-50"
                href={banner.link_url}
                target="_blank"
                rel="noreferrer"
              >
                {banner.link_label}
              </a>
            ) : (
              <Link className="btn bg-white text-brand-700 hover:bg-brand-50" to={banner.link_url}>
                {banner.link_label}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
