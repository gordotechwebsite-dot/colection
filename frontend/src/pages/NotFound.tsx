import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="card p-8 text-center">
      <h1 className="text-xl font-bold text-brand-700">Página no encontrada</h1>
      <Link to="/" className="btn-primary mt-4">
        Volver al inicio
      </Link>
    </div>
  );
}
