import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  Users,
  FileText,
  ChevronRight,
  CloudOff,
  Image as ImageIcon,
  UploadCloud,
  Download,
  Trash2,
} from "lucide-react";
import FloatingActionButtons from "../components/FloatingActionButtons";
import { useLanguage } from "../hooks/useLanguage";
import { api } from "../services/api";

export default function HomePage({ onNavigate }) {
  const { t } = useLanguage();
  const [masterLogo, setMasterLogo] = useState(null);
  const [online, setOnline] = useState(null);

  useEffect(() => {
    api
      .bootstrap()
      .then((data) => {
        setMasterLogo(data?.settings?.logo || null);
        setOnline(true);
      })
      .catch(() => setOnline(false));
  }, []);

  const handleMasterLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const uploaded = await api.uploadFile("global", file);
      await api.saveSettings({ logo: uploaded.url });
      setMasterLogo(uploaded.url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMasterLogoDelete = async () => {
    try {
      if (masterLogo) await api.deleteUpload(masterLogo).catch(() => {});
      await api.saveSettings({ logo: null });
      setMasterLogo(null);
    } catch (err) {
      console.error(err);
    }
  };

  const cards = [
    {
      key: "admin",
      view: "/admin/login",
      icon: ShieldCheck,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      title: t("admin"),
      description: t("adminDesc"),
    },
    {
      key: "qualifica",
      view: "/qualifica/login",
      icon: Users,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      title: t("qualify"),
      description: t("qualifyDesc"),
    },
    {
      key: "tecnica",
      view: "/tecnica/login",
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
          {masterLogo && (
            <img src={masterLogo} alt="Logo" className="mx-auto mb-6 h-16 object-contain" />
          )}
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-sm font-bold italic tracking-wide text-gray-400 sm:text-base">
            {t("subtitle")}
          </p>
        </header>

        <div className="mb-12 z-10 w-full max-w-lg mx-auto bg-white p-8 rounded-[2.5rem] shadow-xl border">
          <div className="flex items-center gap-4 mb-6"><ImageIcon className="text-blue-600"/><h3 className="font-black uppercase text-sm">Official Logo Setup</h3></div>
          <div className="relative group bg-slate-50 border-2 border-dashed p-10 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-100 transition-all">
            {masterLogo ? (
              <>
                <img src={masterLogo} className="h-16 object-contain" />
                <div className="absolute top-4 right-4 flex gap-2 z-20">
                  <a href={masterLogo} download="master_logo" onClick={(e) => e.stopPropagation()} className="bg-white p-2 rounded-full shadow hover:text-emerald-600 text-slate-400 transition-all" title="Scarica Logo">
                    <Download size={16}/>
                  </a>
                  <button onClick={handleMasterLogoDelete} className="bg-white p-2 rounded-full shadow hover:text-red-600 text-slate-400 transition-all" title="Elimina Logo">
                    <Trash2 size={16}/>
                  </button>
                </div>
              </>
            ) : <UploadCloud size={48} className="text-slate-300" />}
            <span className="text-[10px] font-black uppercase text-slate-400">Imposta Logo Ufficiale</span>
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleMasterLogoUpload} />
          </div>
        </div>

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

              <h2 className="text-3xl font-black text-slate-900 mb-4 uppercase leading-none">{title}</h2>
              <p className="flex-1 text-slate-400 font-medium">{description}</p>

              <button
                type="button"
                onClick={() => onNavigate(view)}
                className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-700 transition flex items-center justify-center gap-2 shadow-lg"
              >
                {t("access")} <ChevronRight size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <FloatingActionButtons />
    </div>
  );
}
