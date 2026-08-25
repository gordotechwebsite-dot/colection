import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api, getToken, setToken } from "./api";
import type { SellerAccount } from "./types";

interface SessionValue {
  seller: SellerAccount | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (body: Record<string, unknown>) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
  setSeller: (seller: SellerAccount) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [seller, setSeller] = useState<SellerAccount | null>(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setSeller(null);
      return;
    }
    try {
      setSeller(await api.me());
    } catch {
      setToken(null);
      setSeller(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const value = useMemo<SessionValue>(
    () => ({
      seller,
      loading,
      signIn: async (email, password) => {
        const auth = await api.login({ email, password });
        setToken(auth.token);
        setSeller(auth.seller);
      },
      signUp: async (body) => {
        const auth = await api.register(body);
        setToken(auth.token);
        setSeller(auth.seller);
      },
      signOut: () => {
        setToken(null);
        setSeller(null);
      },
      refresh,
      setSeller,
    }),
    [seller, loading, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession debe usarse dentro de SessionProvider");
  return context;
}
