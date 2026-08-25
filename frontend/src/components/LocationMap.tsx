type Props = {
  /** Zona, ciudad y país; se usa como búsqueda aproximada en el mapa. */
  place: string;
};

/** Mapa fijo y aproximado de la zona: no permite acercar ni desplazar. */
export default function LocationMap({ place }: Props) {
  if (!place) return null;

  const src = `https://www.google.com/maps?q=${encodeURIComponent(place)}&z=13&output=embed`;

  return (
    <div className="overflow-hidden rounded-xl border border-brand-100">
      <iframe
        src={src}
        title={`Ubicación aproximada: ${place}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="pointer-events-none block h-40 w-full border-0"
      />
    </div>
  );
}
