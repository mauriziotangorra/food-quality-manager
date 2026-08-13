import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
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
      <div className="max-w-md w-full bg-white p-14 rounded-[3.5rem] shadow-2xl relative text-slate-900">
        <button
          onClick={onBack}
          className="absolute top-8 left-8 text-slate-300 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft />
        </button>
        <h2 className="text-4xl font-black text-center uppercase tracking-tighter mb-12 leading-none text-slate-900">
          {isAdmin ? t("loginAdminTitle") : t("loginTitle")}
        </h2>
        <div className="space-y-8 text-slate-900">
          {isAdmin && (
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-50 border-4 border-slate-50 p-6 rounded-3xl outline-none focus:border-slate-900 text-center font-mono text-xl tracking-widest shadow-inner text-slate-900"
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
            className="w-full bg-slate-50 border-4 border-slate-50 p-6 rounded-3xl outline-none focus:border-slate-900 text-center font-mono text-2xl uppercase tracking-widest shadow-inner text-slate-900"
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
