import React from "react";
import { Building2, Save } from "lucide-react";

const FIELDS = ["rs", "piva", "sede", "citta", "provincia", "cap", "nazione"];

export default function AnagraficaTab({ t, qualData, setQualData, saveImmediate }) {
  const update = (field, value) => {
    setQualData((prev) => ({ ...prev, anagrafica: { ...prev.anagrafica, [field]: value } }));
  };

  return (
    <div className="space-y-16">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Building2 size={48} />
          <h3 className="text-5xl font-black uppercase tracking-tighter">{t("tabAnagrafica")}</h3>
        </div>
        <button
          onClick={() => saveImmediate(qualData)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Save size={16} /> {t("save")}
        </button>
      </div>
      <div className="h-1 bg-slate-100 rounded-full mb-12" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {FIELDS.map((f) => (
          <div key={f} className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest ml-2">{t(f).toUpperCase()}</label>
            <input
              type="text"
              className="w-full bg-slate-50 p-6 rounded-3xl border-none font-black shadow-inner outline-none focus:ring-2 ring-emerald-100"
              value={qualData.anagrafica[f] || ""}
              onChange={(e) => update(f, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
