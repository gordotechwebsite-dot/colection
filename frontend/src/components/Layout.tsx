import { LayoutDashboard, LogOut, PlusCircle, Store } from "lucide-react";
import { Link, Outlet, useNavigate } from "react-router-dom";

import { useSession } from "../lib/session";

export default function Layout() {
  const { seller, signOut } = useSession();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-brand-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-black text-brand-700">
            <Store size={22} /> Redbook
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            {seller ? (
              <>
                <Link to="/publicar" className="btn-primary">
                  <PlusCircle size={16} /> Publicar
                </Link>
                <Link to="/mi-cuenta" className="btn-ghost">
                  {seller.public_id}
                </Link>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    signOut();
                    navigate("/");
                  }}
                  title="Cerrar sesión"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <>
                <Link to="/ingresar" className="btn-ghost">
                  Ingresar
                </Link>
                <Link to="/registro" className="btn-primary">
                  ANÚNCIATE
                </Link>
              </>
            )}
            <Link to="/admin" className="btn-ghost" title="Panel de control">
              <LayoutDashboard size={16} />
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="mt-10 border-t border-brand-100 bg-white py-6 text-center text-sm text-neutral-500">
        Redbook · Clasificados globales
      </footer>
    </div>
  );
}
