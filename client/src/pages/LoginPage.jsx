import React, { useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { useAuth } from "../hooks/useAuth";
import { useModal } from "../hooks/useModal";

// area: 'admin' | 'qual' | 'tech'
export default function LoginPage({ area, onBack, onSuccess }) {
  const { t } = useLanguage();
  const { loginAdmin, loginSupplier } = useAuth();
  const { showAlert } = useModal();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = area === "admin";

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (isAdmin) await loginAdmin(username, password);
      else await loginSupplier(password, area);
      onSuccess();
    } catch (e) {
      // Distingue un vero "credenziali errate" (401 dal server) da altri problemi
      // (backend non raggiungibile, errore di rete, 500...) invece di mostrare
      // sempre lo stesso messaggio generico.
      const isAuthError = /credenziali|password non valida|401/i.test(e.message || "");
      showAlert(isAuthError ? t("alertWrongPwd") : `${t("alertWrongPwd")}\n\n(${e.message || "Errore di connessione al server"})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans text-slate-900">
      <div className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-xl text-center border relative">
        <button
          onClick={onBack}
          className="absolute top-8 left-8 text-slate-300 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft />
        </button>
        <Lock className="mx-auto text-blue-600 mb-8" size={64} />
        <h2 className="text-3xl font-black mb-8 uppercase tracking-tighter">
          {isAdmin ? t("loginAdminTitle") : t("loginTitle")}
        </h2>
        <div className="space-y-8">
          {isAdmin && (
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border-4 p-6 rounded-3xl text-center font-mono text-4xl focus:border-blue-500 outline-none shadow-inner"
              placeholder={t("usernamePlaceholder")}
            />
          )}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            className="w-full border-4 p-6 rounded-3xl text-center font-mono text-4xl focus:border-blue-500 outline-none shadow-inner"
            placeholder={t("passwordPlaceholder")}
          />
          <button
            disabled={loading}
            onClick={handleSubmit}
            className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest shadow-xl transition active:scale-95 disabled:opacity-50"
          >
            {t("access")}
          </button>
        </div>
      </div>
    </div>
  );
}
