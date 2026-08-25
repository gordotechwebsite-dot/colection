import { api } from "../lib/api";
import type { Listing } from "../lib/types";

function WhatsAppLogo() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M16.03 5.33c-5.87 0-10.64 4.77-10.64 10.64 0 1.87.49 3.7 1.42 5.31L5.33 26.67l5.53-1.45a10.6 10.6 0 0 0 5.17 1.32h.01c5.87 0 10.64-4.77 10.64-10.64 0-2.84-1.11-5.51-3.12-7.52a10.56 10.56 0 0 0-7.53-3.05Zm6.25 15.02c-.26.73-1.53 1.4-2.11 1.46-.58.06-1.12.28-3.79-.79-3.22-1.29-5.24-4.6-5.4-4.81-.16-.21-1.28-1.71-1.28-3.26 0-1.55.81-2.31 1.1-2.63.29-.31.63-.39.84-.39.21 0 .42 0 .61.01.2.01.46-.07.71.54.26.63.88 2.18.96 2.34.08.16.13.34.02.55-.1.21-.53.76-.73.98-.15.17-.31.36-.13.67.18.31.79 1.31 1.7 2.12 1.16 1.04 2.14 1.36 2.45 1.52.31.16.49.13.67-.08.18-.21.78-.9.98-1.21.21-.31.42-.26.71-.16.29.11 1.83.87 2.14 1.02.31.16.52.24.6.37.08.13.08.76-.18 1.49Z" />
    </svg>
  );
}

function InstagramLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.96.24 2.65.51.71.28 1.31.65 1.9 1.24.59.59.96 1.19 1.24 1.9.27.69.46 1.48.51 2.65.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.24 1.96-.51 2.65-.28.71-.65 1.31-1.24 1.9-.59.59-1.19.96-1.9 1.24-.69.27-1.48.46-2.65.51-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.96-.24-2.65-.51a5.26 5.26 0 0 1-1.9-1.24 5.26 5.26 0 0 1-1.24-1.9c-.27-.69-.46-1.48-.51-2.65C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.24-1.96.51-2.65.28-.71.65-1.31 1.24-1.9a5.26 5.26 0 0 1 1.9-1.24c.69-.27 1.48-.46 2.65-.51C8.42 2.17 8.8 2.16 12 2.16Zm0 3.68a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32Zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm7.85-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0Z" />
    </svg>
  );
}

export default function ContactButton({ listing }: { listing: Listing }) {
  const isInstagram = listing.contact_channel === "instagram";

  return (
    <a
      href={listing.contact_url}
      target="_blank"
      rel="noreferrer"
      aria-label={`Escribir por ${listing.contact_label}`}
      title={`Escribir por ${listing.contact_label}`}
      onClick={() => {
        void api.contact(listing.id).catch(() => undefined);
      }}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-105 ${
        isInstagram
          ? "bg-gradient-to-br from-amber-400 via-brand-600 to-fuchsia-700"
          : "bg-[#25D366]"
      }`}
    >
      {isInstagram ? <InstagramLogo /> : <WhatsAppLogo />}
    </a>
  );
}
