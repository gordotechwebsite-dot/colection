import { AtSign, MessageCircle } from "lucide-react";

import type { ContactChannel } from "../lib/types";

interface Props {
  channel: ContactChannel;
  whatsapp: string;
  instagram: string;
  onChange: (value: {
    channel: ContactChannel;
    whatsapp: string;
    instagram: string;
  }) => void;
}

const CHANNELS: { value: ContactChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
];

export default function ContactChannelFields({
  channel,
  whatsapp,
  instagram,
  onChange,
}: Props) {
  return (
    <div className="space-y-3">
      <div>
        <span className="label">Canal de comunicación</span>
        <div className="grid grid-cols-2 gap-2">
          {CHANNELS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ channel: option.value, whatsapp, instagram })}
              className={`filter-btn flex items-center justify-center gap-2 ${
                channel === option.value ? "filter-btn-active" : ""
              }`}
            >
              {option.value === "whatsapp" ? (
                <MessageCircle size={16} />
              ) : (
                <AtSign size={16} />
              )}
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {channel === "whatsapp" ? (
        <div>
          <label className="label" htmlFor="whatsapp">
            Número de WhatsApp (con indicativo del país)
          </label>
          <input
            id="whatsapp"
            className="input"
            placeholder="+573001112233"
            value={whatsapp}
            onChange={(event) =>
              onChange({ channel, whatsapp: event.target.value, instagram })
            }
            required
          />
        </div>
      ) : (
        <div>
          <label className="label" htmlFor="instagram">
            Usuario de Instagram
          </label>
          <input
            id="instagram"
            className="input"
            placeholder="tu.usuario"
            value={instagram}
            onChange={(event) =>
              onChange({ channel, whatsapp, instagram: event.target.value })
            }
            required
          />
        </div>
      )}
      <p className="text-xs text-neutral-500">
        El botón de tus anuncios abrirá directo la conversación contigo por este canal.
      </p>
    </div>
  );
}
