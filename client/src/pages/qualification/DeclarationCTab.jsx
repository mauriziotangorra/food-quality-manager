import React from "react";
import { FileCheck2, Save } from "lucide-react";
import { useModal } from "../../hooks/useModal";

export default function DeclarationCTab({ t, lang, qualData, setQualData, globalConfig, saveImmediate }) {
  const { showAlert } = useModal();
  const langKey = lang.toLowerCase();

  const updateImpegno = (idx, checked) => {
    setQualData((prev) => {
      const impegni = Array.isArray(prev.fileD?.impegni) ? [...prev.fileD.impegni] : [];
      impegni[idx] = checked;
      return { ...prev, fileD: { ...prev.fileD, impegni } };
    });
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <FileCheck2 size={48} className="text-slate-900" />
          <h3 className="text-5xl font-black uppercase tracking-tighter text-slate-900">{t("tabDichiarazioneC")}</h3>
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

      <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-200 shadow-inner">
        <div className="border-b-2 border-slate-200 pb-4 mb-8">
          <h4 className="text-2xl font-black uppercase text-slate-800">{t("declCSimpleTitle")}</h4>
        </div>
        <div className="space-y-6">
          {(globalConfig.impegniC || []).map((imp, idx) => {
            const textValue = imp[langKey] || imp.it || "";
            return (
              <div key={imp.id || idx} className="flex items-start gap-4 group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-300 transition-colors">
                <input
                  type="checkbox"
                  className="mt-1 w-6 h-6 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 shrink-0"
                  checked={qualData.fileD?.impegni?.[idx] || false}
                  onChange={(e) => updateImpegno(idx, e.target.checked)}
                />
                <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors leading-relaxed text-justify">{textValue}</span>
              </div>
            );
          })}
          {(globalConfig.impegniC || []).length === 0 && (
            <p className="text-sm font-bold text-slate-400 text-center py-6">{t("noDeclarationsAtMoment")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
