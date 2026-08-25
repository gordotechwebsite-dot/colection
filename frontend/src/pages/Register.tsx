import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import ContactChannelFields from "../components/ContactChannelFields";
import { useSession } from "../lib/session";
import type { ContactChannel, SellerType } from "../lib/types";

export default function Register() {
  const { signUp } = useSession();
  const navigate = useNavigate();
  const [sellerType, setSellerType] = useState<SellerType | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [contact, setContact] = useState<{
    channel: ContactChannel;
    whatsapp: string;
    instagram: string;
  }>({ channel: "whatsapp", whatsapp: "", instagram: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await signUp({
        ...form,
        seller_type: sellerType,
        contact_channel: contact.channel,
        whatsapp: contact.channel === "whatsapp" ? contact.whatsapp : null,
        instagram: contact.channel === "instagram" ? contact.instagram : null,
      });
      navigate("/publicar");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos registrarte");
    } finally {
      setSaving(false);
    }
  }

  if (!sellerType) {
    return (
      <div className="card mx-auto max-w-md space-y-4 p-6">
        <div>
          <h1 className="text-xl font-bold text-brand-700">¿Eres agencia o independiente?</h1>
          <p className="text-sm text-neutral-600">
            Escoge una opción para continuar con tu registro.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="btn-primary justify-center py-3"
            onClick={() => setSellerType("agency")}
          >
            Agencia
          </button>
          <button
            type="button"
            className="btn-ghost justify-center py-3"
            onClick={() => setSellerType("independent")}
          >
            Independiente
          </button>
        </div>
        <p className="text-center text-sm text-neutral-600">
          ¿Ya tienes cuenta?{" "}
          <Link to="/ingresar" className="font-semibold text-brand-700">
            Ingresa
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-md space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold text-brand-700">Crear cuenta de vendedor</h1>
        <p className="text-sm text-neutral-600">
          {sellerType === "agency" ? "Agencia" : "Independiente"} ·{" "}
          <button
            type="button"
            className="font-semibold text-brand-700 underline"
            onClick={() => setSellerType(null)}
          >
            cambiar
          </button>
        </p>
        <p className="text-sm text-neutral-600">
          Recibirás un ID de vendedor que se mantiene igual en todos tus anuncios.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="name">
          Nombre o negocio
        </label>
        <input
          id="name"
          className="input"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="email">
          Correo
        </label>
        <input
          id="email"
          type="email"
          className="input"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Contraseña (mínimo 8 caracteres)
        </label>
        <input
          id="password"
          type="password"
          className="input"
          minLength={8}
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          required
        />
      </div>
      <ContactChannelFields {...contact} onChange={setContact} />
      {error && <p className="text-sm text-brand-700">{error}</p>}
      <button className="btn-primary w-full" disabled={saving}>
        {saving ? "Creando cuenta…" : "Crear cuenta"}
      </button>
      <p className="text-center text-sm text-neutral-600">
        ¿Ya tienes cuenta?{" "}
        <Link to="/ingresar" className="font-semibold text-brand-700">
          Ingresa
        </Link>
      </p>
    </form>
  );
}
