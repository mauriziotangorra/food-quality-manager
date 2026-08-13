import React, { useEffect, useState } from "react";
import { ShieldCheck, Users, FileText, ChevronRight, CloudOff } from "lucide-react";
import FloatingActionButtons from "../components/FloatingActionButtons";
import { useLanguage } from "../hooks/useLanguage";
import { api } from "../services/api";

export default function HomePage({ onNavigate }) {
  const { t } = useLanguage();
  const [logo, setLogo] = useState(null);
  const [online, setOnline] = useState(null);

  useEffect(() => {
    api
      .bootstrap()
      .then((data) => {
        setLogo(data?.settings?.logo || null);
        setOnline(true);
      })
      .catch(() => setOnline(false));
  }, []);

  const cards = [
    {
      key: "admin",
      view: "login_admin",
      icon: ShieldCheck,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      title: t("admin"),
      description: t("adminDesc"),
    },
    {
      key: "qualifica",
      view: "login_qual",
      icon: Users,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      title: t("qualify"),
      description: t("qualifyDesc"),
    },
    {
      key: "tecnica",
      view: "login_tech",
      icon: FileText,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      title: t("tech"),
      description: t("techDesc"),
    },
  ];

  return (
    <div className="min-h-screen bg-[#eef0f4] px-6 py-10 font-sans text-[#12182b]">
      <div className="mx-auto max-w-[1300px]">
        {/* Top bar */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-extrabold tracking-wide text-[#1c2233]">
            {online ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {t("workspaceActive")}
              </>
            ) : (
              <>
                <CloudOff size={14} className="text-red-400" />
                Offline
              </>
            )}
          </span>
        </div>

        {/* Hero */}
        <header className="mx-auto mb-10 max-w-3xl text-center">
          {logo && (
            <img src={logo} alt="Logo" className="mx-auto mb-6 h-16 object-contain" />
          )}
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-sm font-bold italic tracking-wide text-gray-400 sm:text-base">
            {t("subtitle")}
          </p>
        </header>

        {/* Cards grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map(({ key, view, icon: Icon, iconBg, iconColor, title, description }) => (
            <div
              key={key}
              className="flex min-h-[340px] flex-col rounded-[22px] bg-white p-8 shadow-sm"
            >
              <div
                className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${iconBg} ${iconColor}`}
              >
                <Icon size={30} strokeWidth={2} />
              </div>

              <h2 className="mb-2 text-2xl font-black">{title}</h2>
              <p className="flex-1 text-[15px] leading-relaxed text-gray-400">
                {description}
              </p>

              <button
                type="button"
                onClick={() => onNavigate(view)}
                className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-[#12182b] px-5 py-4 text-sm font-extrabold tracking-widest text-white transition hover:opacity-85"
              >
                {t("access")}
                <ChevronRight size={16} strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <FloatingActionButtons />
    </div>
  );
}
