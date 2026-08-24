import React from "react";
import { Truck, Save } from "lucide-react";
import { useModal } from "../../hooks/useModal";

export default function DeclarationBTab({ t, lang, qualData, setQualData, globalConfig, saveImmediate }) {
  const { showAlert } = useModal();
  const langKey = lang.toLowerCase();

  const updateFileB = (id, checked) => {
    setQualData((prev) => ({ ...prev, fileB: { ...prev.fileB, [id]: checked } }));
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Truck size={48} className="text-slate-900" />
          <h3 className="text-5xl font-black uppercase tracking-tighter text-slate-900">{t("tabDichiarazioneB")}</h3>
        </div>
        <button
          onClick={async () => {
            const ok = await saveImmediate(qualData);
            if (ok) showAlert(t("alertSaved"));
          }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Save size={16} /> {t("save")}
        </button>
      </div>
      <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-200 shadow-inner space-y-6">
        <div className="border-b-2 border-slate-200 pb-4 mb-6">
          <h4 className="text-2xl font-black uppercase text-slate-800">{t("logisticsProcessTitle")}</h4>
        </div>

        {(globalConfig.impegniB || []).map((imp) => (
          <label key={imp.id} className="flex items-start gap-5 cursor-pointer group bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-emerald-400 transition-all relative">
            <input
              type="checkbox"
              className="mt-1.5 w-6 h-6 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
              checked={qualData.fileB[imp.id] || false}
              onChange={(e) => updateFileB(imp.id, e.target.checked)}
            />
            <div className="w-full">
              <span className="text-lg font-black text-slate-900 block mb-2">{imp[`title_${langKey}`] || imp.title_it}</span>
              <span className="text-sm font-bold text-slate-500 leading-relaxed block text-justify">{imp[`desc_${langKey}`] || imp.desc_it}</span>
            </div>
          </label>
        ))}
        {(globalConfig.impegniB || []).length === 0 && (
          <p className="text-sm font-bold text-slate-400 text-center py-6">{t("noParametersAtMoment")}</p>
        )}
      </div>
    </div>
  );
}
