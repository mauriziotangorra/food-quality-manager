import React from "react";
import { AlertCircle, Save, UploadCloud, Download, X } from "lucide-react";
import { useModal } from "../../hooks/useModal";
import { api } from "../../services/api";

const DOC_SLOTS = [
  { key: "allergenManagementPlan", labelKey: "allergenMgmtPlan" },
  { key: "contaminationRiskAssessment", labelKey: "contaminationRiskAssessment" },
];

export default function DeclarationATab({ t, lang, qualData, setQualData, globalConfig, supplierId, saveImmediate }) {
  const { showAlert, showConfirm } = useModal();
  const langKey = lang.toLowerCase();

  const updateImpegno = (idx, checked) => {
    setQualData((prev) => {
      const impegni = Array.isArray(prev.fileA.impegni) ? [...prev.fileA.impegni] : [];
      impegni[idx] = checked;
      return { ...prev, fileA: { ...prev.fileA, impegni } };
    });
  };

  const handleUpload = async (key, e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    try {
      const uploaded = [];
      for (const file of files) {
        // eslint-disable-next-line no-await-in-loop
        const res = await api.uploadFile(supplierId, file);
        uploaded.push({ name: res.name, url: res.url });
      }
      const currentFiles = Array.isArray(qualData.fileA[key]) ? qualData.fileA[key] : [];
      const next = { ...qualData, fileA: { ...qualData.fileA, [key]: [...currentFiles, ...uploaded] } };
      setQualData(next);
      const ok = await saveImmediate(next);
      if (ok) showAlert(t("alertSaved"));
    } catch (err) {
      showAlert(err.message || t("alertFileSize"));
    }
  };

  const removeFile = (key, fileUrl) => {
    showConfirm(t("alertDeletePrompt"), () => {
      api.deleteUpload(fileUrl).catch(() => {});
      const currentFiles = Array.isArray(qualData.fileA[key]) ? qualData.fileA[key] : [];
      const next = { ...qualData, fileA: { ...qualData.fileA, [key]: currentFiles.filter((f) => f.url !== fileUrl) } };
      setQualData(next);
      saveImmediate(next);
    });
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <AlertCircle size={48} className="text-slate-900" />
          <h3 className="text-5xl font-black uppercase tracking-tighter text-slate-900">{t("tabDichiarazioneA")}</h3>
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
          <h4 className="text-2xl font-black uppercase text-slate-800">{t("declAOgmTitle")}</h4>
        </div>
        <div className="space-y-6">
          {(globalConfig.impegniA || []).map((imp, idx) => {
            const textValue = imp[langKey] || imp.it || "";
            return (
              <div key={imp.id || idx} className="flex items-start gap-4 group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-300 transition-colors relative">
                <input
                  type="checkbox"
                  className="mt-1 w-6 h-6 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 shrink-0"
                  checked={qualData.fileA.impegni[idx] || false}
                  onChange={(e) => updateImpegno(idx, e.target.checked)}
                />
                <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors leading-relaxed text-justify">{textValue}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-200 shadow-inner space-y-8">
        <div className="border-b-2 border-slate-200 pb-4">
          <h4 className="text-2xl font-black uppercase text-slate-800">{t("allergenMgmtSectionTitle")}</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {DOC_SLOTS.map((slot) => {
            const files = Array.isArray(qualData.fileA[slot.key]) ? qualData.fileA[slot.key] : [];
            return (
              <div key={slot.key} className="bg-white p-6 rounded-2xl border border-slate-100 space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-500 block">{t(slot.labelKey)}</label>
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {files.map((f) => (
                      <div key={f.url} className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                        <p className="text-xs text-blue-600 font-bold max-w-[220px] truncate" title={f.name}>{f.name}</p>
                        <a href={f.url} download={f.name} className="text-blue-600 hover:text-emerald-600 bg-white p-1.5 rounded-lg shadow-sm transition-all">
                          <Download size={13} />
                        </a>
                        <button onClick={() => removeFile(slot.key, f.url)} className="text-slate-400 hover:text-red-600 bg-white p-1.5 rounded-lg shadow-sm transition-all">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {files.length === 0 && <p className="text-xs text-slate-400 font-bold">{t("noFileUploaded")}</p>}
                <div className="relative overflow-hidden inline-block">
                  <button className="bg-slate-900 text-white rounded-xl px-5 py-2.5 font-black text-[11px] uppercase hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center gap-2 pointer-events-none">
                    <UploadCloud size={15} /> {t("uploadFileBtn")}
                  </button>
                  <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleUpload(slot.key, e)} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
