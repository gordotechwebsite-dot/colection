import { AtSign, MessageCircle } from "lucide-react";

import { api } from "../lib/api";
import type { Listing } from "../lib/types";

export default function ContactButton({ listing }: { listing: Listing }) {
  const isInstagram = listing.contact_channel === "instagram";
  const handle = isInstagram
    ? `@${listing.seller.instagram}`
    : listing.seller.whatsapp;

  return (
    <a
      href={listing.contact_url}
      target="_blank"
      rel="noreferrer"
      onClick={() => {
        void api.contact(listing.id).catch(() => undefined);
      }}
      className={`btn w-full text-white ${
        isInstagram
          ? "bg-gradient-to-r from-brand-600 to-fuchsia-600 hover:opacity-90"
          : "bg-emerald-600 hover:bg-emerald-700"
      }`}
    >
      {isInstagram ? <AtSign size={18} /> : <MessageCircle size={18} />}
      Escribir por {listing.contact_label}
      <span className="hidden font-normal opacity-80 sm:inline">{handle}</span>
    </a>
  );
}
