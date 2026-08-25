import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { mediaUrl } from "../lib/api";
import type { Banner } from "../lib/types";

function BannerLink({ url, children }: { url: string; children: ReactNode }) {
  if (url.startsWith("http")) {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return <Link to={url}>{children}</Link>;
}

export default function HomeBanner({ banner }: { banner: Banner }) {
  if (banner.image_url) {
    const image = (
      <img
        src={mediaUrl(banner.image_url)}
        alt={banner.title || "Banner"}
        className="block w-full"
      />
    );
    return (
      <section className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm">
        {banner.link_url ? <BannerLink url={banner.link_url}>{image}</BannerLink> : image}
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-brand-100 bg-brand-600 shadow-sm">
      <div className="px-5 py-10 text-center sm:py-14">
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
            <BannerLink url={banner.link_url}>
              <span className="btn bg-white text-brand-700 hover:bg-brand-50">
                {banner.link_label}
              </span>
            </BannerLink>
          </div>
        )}
      </div>
    </section>
  );
}
