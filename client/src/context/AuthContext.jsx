import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { api, setAuthToken, getAuthToken, setUnauthorizedHandler } from "../services/api";

const AuthContext = createContext(null);

// session: null (logged out) | { role: 'admin', admin } | { role: 'supplier', area, supplier }
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    setAuthToken(null);
    setSession(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // Al primo caricamento, se c'è un token salvato prova a ripristinare la sessione.
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setReady(true);
      return;
    }
    api
      .me()
      .then((data) => {
        if (data.role === "admin") setSession({ role: "admin", admin: data.admin });
        else if (data.role === "supplier") setSession({ role: "supplier", area: data.area, supplier: data.supplier });
        else setAuthToken(null);
      })
      .catch(() => setAuthToken(null))
      .finally(() => setReady(true));
  }, []);

  const loginAdmin = useCallback(async (username, password) => {
    const data = await api.loginAdmin(username, password);
    setAuthToken(data.token);
    setSession({ role: "admin", admin: data.admin });
    return data.admin;
  }, []);

  const loginSupplier = useCallback(async (code, area) => {
    const data = await api.loginSupplier(code, area);
    setAuthToken(data.token);
    setSession({ role: "supplier", area, supplier: data.supplier });
    return data.supplier;
  }, []);

  const value = useMemo(
    () => ({ session, ready, loginAdmin, loginSupplier, logout }),
    [session, ready, loginAdmin, loginSupplier, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
