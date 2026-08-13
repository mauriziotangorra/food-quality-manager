import React, { useEffect, useState } from "react";
import HomePage from "./HomePage";
import LoginPage from "./LoginPage";
import AdminPage from "./AdminPage";
import QualificationPage from "./QualificationPage";
import TechnicalPage from "./TechnicalPage";
import { useAuth } from "../hooks/useAuth";

// Sostituisce lo state "view" del file originale (nessuna libreria di routing
// installata nel progetto: si mantiene lo stesso pattern a stato singolo, solo
// diviso su più file invece di un unico componente da 2900 righe).
export default function PortalRouter() {
  const { session, ready, logout } = useAuth();
  const [view, setView] = useState("home");

  // Se al caricamento esiste già una sessione valida (token salvato), riporta
  // l'utente direttamente nell'area corretta invece che alla home.
  useEffect(() => {
    if (!ready || !session) return;
    if (session.role === "admin") setView("admin");
    else if (session.role === "supplier") setView(session.area === "qual" ? "supplier_qual" : "supplier_tech");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const goHome = () => {
    logout();
    setView("home");
  };

  if (!ready) return null;

  switch (view) {
    case "login_admin":
      return <LoginPage area="admin" onBack={() => setView("home")} onSuccess={() => setView("admin")} />;
    case "login_qual":
      return <LoginPage area="qual" onBack={() => setView("home")} onSuccess={() => setView("supplier_qual")} />;
    case "login_tech":
      return <LoginPage area="tech" onBack={() => setView("home")} onSuccess={() => setView("supplier_tech")} />;
    case "admin":
      return <AdminPage onLogout={goHome} />;
    case "supplier_qual":
      return <QualificationPage onLogout={goHome} />;
    case "supplier_tech":
      return <TechnicalPage onLogout={goHome} />;
    default:
      return <HomePage onNavigate={setView} />;
  }
}
