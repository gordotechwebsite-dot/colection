const MESSAGE = "TODOS NUESTROS PERFILES SON 100% VERIFICADOS";

/** Cinta fija abajo con el mensaje desplazándose sin parar. */
export default function VerifiedTicker() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 overflow-hidden bg-[#0a63e5] py-1.5">
      {/* Dos copias seguidas: al recorrer el 50% el bucle queda sin salto. */}
      <div className="flex w-max animate-marquee">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className="px-8 text-xs font-semibold tracking-widest text-white sm:text-sm"
              >
                {MESSAGE}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
