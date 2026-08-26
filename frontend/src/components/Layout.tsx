import { Flame, LayoutDashboard, LogOut, PlusCircle } from "lucide-react";
import { Link, Outlet, useNavigate } from "react-router-dom";

import { useSession } from "../lib/session";
import VerifiedTicker from "./VerifiedTicker";

export default function Layout() {
  const { seller, signOut } = useSession();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-20 border-b border-brand-100 bg-white/95 backdrop-blur">
        <div className="relative mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-black text-brand-700">
            <Flame size={22} /> Redbook
          </Link>
          <nav className="absolute right-4 flex items-center gap-2">
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
            ) : null}
            <Link to="/admin" className="btn-ghost" title="Panel de control">
              <LayoutDashboard size={16} />
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      {!seller && (
        <div className="mt-6 flex justify-center px-4">
          <Link to="/registro" className="btn-primary">
            ANUNCIATE
          </Link>
        </div>
      )}
      <footer className="mt-10 border-t border-brand-100 bg-white py-6 text-center text-sm text-neutral-500">
        Redbook · Experiencias Indescriptibles
      </footer>
      <VerifiedTicker />
    </div>
  );
}
