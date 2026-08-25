interface Props {
  className?: string;
}

/** Chulo azul de verificado, con el borde ondulado y el degradado clásicos. */
export default function VerifiedBadge({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label="Verificado"
      className={className}
    >
      <defs>
        <linearGradient id="verified-badge-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2aa4f4" />
          <stop offset="100%" stopColor="#0a63e5" />
        </linearGradient>
      </defs>
      <path
        fill="url(#verified-badge-gradient)"
        d="M12 1l2.2 1.86 2.87-.35.98 2.72 2.72.98-.35 2.87L22 12l-1.86 2.2.35 2.87-2.72.98-.98 2.72-2.87-.35L12 23l-2.2-1.86-2.87.35-.98-2.72-2.72-.98.35-2.87L2 12l1.86-2.2-.35-2.87 2.72-.98.98-2.72 2.87.35z"
      />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.6 12.3l3 3 5.8-6"
      />
    </svg>
  );
}
