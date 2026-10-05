import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { AuthResponse, User } from "../types/auth";

type AuthContextValue = {
  user?: User; accessToken?: string; loading: boolean; authenticated: boolean;
  establishSession: (auth: AuthResponse) => Promise<void>; setUser: (user: User) => void; signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setCurrentUser] = useState<User>();
  const [accessToken, setAccessToken] = useState<string>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api<{ user: User }>("/auth/me")
      .then(({ user: current }) => { if (active) setCurrentUser(current); })
      .catch(() => { if (active) setCurrentUser(undefined); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const establishSession = useCallback(async (auth: AuthResponse) => {
    setAccessToken(auth.accessToken);
    setCurrentUser(auth.user);
    const current = await api<{ user: User }>("/auth/me");
    setCurrentUser(current.user);
  }, []);
  const setUser = useCallback((next: User) => setCurrentUser(next), []);
  const signOut = useCallback(async () => {
    try { await api("/auth/logout", { method: "POST" }); } finally { setAccessToken(undefined); setCurrentUser(undefined); }
  }, []);
  const value = useMemo(() => ({ user, accessToken, loading, authenticated: Boolean(user), establishSession, setUser, signOut }), [user, accessToken, loading, establishSession, setUser, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
