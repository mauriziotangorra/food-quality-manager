import React from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import HomePage from "./HomePage";
import LoginPage from "./LoginPage";
import AdminPage from "./AdminPage";
import QualificationPage from "./QualificationPage";
import TechnicalPage from "./TechnicalPage";
import { useAuth } from "../hooks/useAuth";

// Path dell'area riservata per una sessione già autenticata (null se non loggato).
function sessionAreaPath(session) {
  if (!session) return null;
  if (session.role === "admin") return "/admin";
  return session.area === "qual" ? "/qualifica" : "/tecnica";
}

// Protegge le pagine riservate: se la sessione non corrisponde al ruolo/area
// richiesti, rimanda al login di quell'area invece di renderizzare la pagina.
function ProtectedRoute({ role, area, loginPath, children }) {
  const { session } = useAuth();
  const matches = session?.role === role && (!area || session.area === area);
  if (!matches) return <Navigate to={loginPath} replace />;
  return children;
}

export default function PortalRouter() {
  const { session, ready, logout } = useAuth();
  const navigate = useNavigate();

  // Attende il ripristino della sessione (token salvato) prima di decidere le rotte,
  // altrimenti un refresh su una pagina protetta rimbalzerebbe sempre al login.
  if (!ready) return null;

  const goHome = () => {
    logout();
    navigate("/");
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          session ? <Navigate to={sessionAreaPath(session)} replace /> : <HomePage onNavigate={navigate} />
        }
      />

      <Route
        path="/admin/login"
        element={
          session?.role === "admin" ? (
            <Navigate to="/admin" replace />
          ) : (
            <LoginPage area="admin" onBack={() => navigate("/")} onSuccess={() => navigate("/admin")} />
          )
        }
      />
      <Route
        path="/qualifica/login"
        element={
          session?.role === "supplier" && session.area === "qual" ? (
            <Navigate to="/qualifica" replace />
          ) : (
            <LoginPage area="qual" onBack={() => navigate("/")} onSuccess={() => navigate("/qualifica")} />
          )
        }
      />
      <Route
        path="/tecnica/login"
        element={
          session?.role === "supplier" && session.area === "tech" ? (
            <Navigate to="/tecnica" replace />
          ) : (
            <LoginPage area="tech" onBack={() => navigate("/")} onSuccess={() => navigate("/tecnica")} />
          )
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin" loginPath="/admin/login">
            <AdminPage onLogout={goHome} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/qualifica"
        element={
          <ProtectedRoute role="supplier" area="qual" loginPath="/qualifica/login">
            <QualificationPage onLogout={goHome} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tecnica"
        element={
          <ProtectedRoute role="supplier" area="tech" loginPath="/tecnica/login">
            <TechnicalPage onLogout={goHome} />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
