import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useSession } from "../lib/session";

export default function Login() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate("/mi-cuenta");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos ingresar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-bold text-brand-700">Ingresar</h1>
      <div>
        <label className="label" htmlFor="email">
          Correo
        </label>
        <input
          id="email"
          type="email"
          className="input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          className="input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-brand-700">{error}</p>}
      <button className="btn-primary w-full" disabled={saving}>
        {saving ? "Ingresando…" : "Ingresar"}
      </button>
      <p className="text-center text-sm text-neutral-600">
        ¿No tienes cuenta?{" "}
        <Link to="/registro" className="font-semibold text-brand-700">
          Regístrate
        </Link>
      </p>
    </form>
  );
}
