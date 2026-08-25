import { Clock, PlusCircle, Rocket } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import ContactChannelFields from "../components/ContactChannelFields";
import ListingCard from "../components/ListingCard";
import { api } from "../lib/api";
import { useSession } from "../lib/session";
import type { ContactChannel, Listing } from "../lib/types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-brand-100 text-brand-700",
};

export default function Account() {
  const { seller, loading, setSeller } = useSession();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [name, setName] = useState("");
  const [contact, setContact] = useState<{
    channel: ContactChannel;
    whatsapp: string;
    instagram: string;
  }>({ channel: "whatsapp", whatsapp: "", instagram: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !seller) navigate("/ingresar");
  }, [loading, seller, navigate]);

  useEffect(() => {
    if (!seller) return;
    setName(seller.name);
    setContact({
      channel: seller.contact_channel,
      whatsapp: seller.whatsapp ?? "",
      instagram: seller.instagram ?? "",
    });
    api
      .myListings()
      .then(setListings)
      .catch(() => setError("No pudimos cargar tus anuncios"));
  }, [seller]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await api.updateMe({
        name,
        contact_channel: contact.channel,
        whatsapp: contact.channel === "whatsapp" ? contact.whatsapp : null,
        instagram: contact.channel === "instagram" ? contact.instagram : null,
      });
      setSeller(updated);
      setListings(await api.myListings());
      setMessage("Guardado. El cambio aplica a todos tus anuncios.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos guardar");
    } finally {
      setSaving(false);
    }
  }

  if (!seller) return <p className="text-sm text-neutral-600">Cargando…</p>;

  return (
    <div className="space-y-5">
      <section className="card flex flex-wrap items-center gap-3 p-4">
        <div>
          <h1 className="text-xl font-bold text-brand-700">{seller.name}</h1>
          <p className="text-sm text-neutral-600">
            ID de vendedor: <strong>{seller.public_id}</strong> · {seller.email}
          </p>
        </div>
        <Link to="/publicar" className="btn-primary ml-auto">
          <PlusCircle size={16} /> Publicar anuncio
        </Link>
      </section>

      <form onSubmit={save} className="card space-y-3 p-4">
        <h2 className="font-semibold">Configuración de contacto</h2>
        <div>
          <label className="label" htmlFor="name">
            Nombre o negocio
          </label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <ContactChannelFields {...contact} onChange={setContact} />
        {message && <p className="text-sm text-emerald-700">{message}</p>}
        {error && <p className="text-sm text-brand-700">{error}</p>}
        <button className="btn-primary" disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="font-semibold">Mis anuncios ({listings.length})</h2>
        {listings.length === 0 && (
          <p className="card p-4 text-sm text-neutral-600">
            Todavía no tienes anuncios.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <div key={listing.id} className="space-y-2">
              <ListingCard listing={listing} />
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    STATUS_STYLES[listing.status] ?? "bg-neutral-100"
                  }`}
                >
                  {listing.status === "pending" && <Clock size={11} className="inline" />}{" "}
                  {listing.status_label}
                </span>
                {listing.status === "approved" && (
                  <button
                    type="button"
                    className="btn-ghost px-2 py-1 text-xs"
                    onClick={() => {
                      void api
                        .bump(listing.id)
                        .then((updated) =>
                          setListings((current) =>
                            current.map((item) =>
                              item.id === updated.id ? updated : item,
                            ),
                          ),
                        )
                        .catch(() => setError("No pudimos renovar el anuncio"));
                    }}
                  >
                    <Rocket size={12} /> Renovar
                  </button>
                )}
              </div>
              {listing.rejection_reason && (
                <p className="text-xs text-brand-700">{listing.rejection_reason}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
