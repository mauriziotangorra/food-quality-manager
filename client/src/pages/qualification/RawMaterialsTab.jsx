import React from "react";
import { Wheat, Save, Plus, UploadCloud, Download, Trash2, X, AlertTriangle } from "lucide-react";
import { useModal } from "../../hooks/useModal";
import { api } from "../../services/api";
import { getRawMaterialIssues, checkRawMaterialsCompleteness } from "../../utils/completenessCheck";

const FREQUENCY_OPTIONS = [
  { value: "Per Lotto", labelKey: "freqPerLotto" },
  { value: "Mensile", labelKey: "freqMensile" },
  { value: "Trimestrale", labelKey: "freqTrimestrale" },
  { value: "Semestrale", labelKey: "freqSemestrale" },
  { value: "Annuale", labelKey: "freqAnnuale" },
  { value: "Altro", labelKey: "freqAltro" },
];

export default function RawMaterialsTab({ t, qualData, setQualData, supplierId, saveImmediate }) {
  const { showAlert, showConfirm } = useModal();
  const materials = qualData.rawMaterials || [];

  const updateMaterials = (next) => setQualData((prev) => ({ ...prev, rawMaterials: next }));

  const addMaterial = () => {
    updateMaterials([
      ...materials,
      { id: Date.now().toString(), name: "", technicalSheet: null, analysisReports: [], riskAssessment: [], frequency: "", notes: "" },
    ]);
  };

  const updateMaterial = (id, field, val) => {
    updateMaterials(materials.map((m) => (m.id === id ? { ...m, [field]: val } : m)));
  };

  const removeMaterial = (id) => {
    showConfirm(t("alertDeletePrompt"), () => {
      const next = materials.filter((m) => m.id !== id);
      updateMaterials(next);
      saveImmediate({ ...qualData, rawMaterials: next });
    });
  };

  // field: 'technicalSheet' (single file, replaces) | 'analysisReports' | 'riskAssessment' (multi, append)
  const handleUpload = async (id, field, e) => {
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
      const next = materials.map((m) => {
        if (m.id !== id) return m;
        if (field === "technicalSheet") return { ...m, technicalSheet: uploaded[0] };
        return { ...m, [field]: [...m[field], ...uploaded] };
      });
      updateMaterials(next);
      const ok = await saveImmediate({ ...qualData, rawMaterials: next });
      if (ok) showAlert(t("alertSaved"));
    } catch (err) {
      showAlert(err.message || t("alertFileSize"));
    }
  };

  const removeTechnicalSheet = (id) => {
    showConfirm(t("alertDeletePrompt"), () => {
      const m = materials.find((mm) => mm.id === id);
      if (m?.technicalSheet?.url) api.deleteUpload(m.technicalSheet.url).catch(() => {});
      const next = materials.map((mm) => (mm.id === id ? { ...mm, technicalSheet: null } : mm));
      updateMaterials(next);
      saveImmediate({ ...qualData, rawMaterials: next });
    });
  };

  const removeListFile = (id, field, fileUrl) => {
    showConfirm(t("alertDeletePrompt"), () => {
      api.deleteUpload(fileUrl).catch(() => {});
      const next = materials.map((m) => (m.id === id ? { ...m, [field]: m[field].filter((f) => f.url !== fileUrl) } : m));
      updateMaterials(next);
      saveImmediate({ ...qualData, rawMaterials: next });
    });
  };

  const FileChips = ({ files, onRemove }) =>
    files.length > 0 && (
      <div className="flex flex-wrap gap-2 mb-3">
        {files.map((f) => (
          <div key={f.url} className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-600 font-bold max-w-[220px] truncate" title={f.name}>{f.name}</p>
            <a href={f.url} download={f.name} className="text-blue-600 hover:text-emerald-600 bg-white p-1.5 rounded-lg shadow-sm transition-all">
              <Download size={13} />
            </a>
            <button onClick={() => onRemove(f.url)} className="text-slate-400 hover:text-red-600 bg-white p-1.5 rounded-lg shadow-sm transition-all">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    );

  const UploadButton = ({ label, onChange, multiple }) => (
    <div className="relative overflow-hidden inline-block">
      <button className="bg-slate-900 text-white rounded-xl px-5 py-2.5 font-black text-[11px] uppercase hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center gap-2 pointer-events-none">
        <UploadCloud size={15} /> {label}
      </button>
      <input type="file" multiple={multiple} className="absolute inset-0 opacity-0 cursor-pointer" onChange={onChange} />
    </div>
  );

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
        <div className="flex items-center gap-6">
          <Wheat size={48} className="text-slate-900" />
          <h3 className="text-5xl font-black uppercase tracking-tighter text-slate-900">{t("tabMateriePrime")}</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              const completeness = checkRawMaterialsCompleteness(qualData);
              if (!completeness.ok) return showAlert(completeness.message);
              const ok = await saveImmediate(qualData);
              if (ok) showAlert(t("alertSaved"));
            }}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Save size={16} /> {t("save")}
          </button>
          <button
            onClick={addMaterial}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus size={16} /> {t("addRawMaterial")}
          </button>
        </div>
      </div>

      <div className="space-y-6 text-slate-900">
        {materials.map((m) => {
          const issues = getRawMaterialIssues(m);
          return (
          <div key={m.id} className={`bg-slate-50 p-8 rounded-[2rem] border shadow-inner space-y-6 ${issues.length ? "border-amber-400" : "border-slate-200"}`}>
            <div className="flex items-start justify-between gap-4">
              <input
                className="text-2xl font-black uppercase text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none w-full"
                value={m.name}
                onChange={(e) => updateMaterial(m.id, "name", e.target.value)}
                placeholder={t("rawMaterialNamePlaceholder")}
              />
              <button onClick={() => removeMaterial(m.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0">
                <Trash2 size={20} />
              </button>
            </div>

            {issues.length > 0 && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-2xl p-4">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-amber-800">{t("docIncompletePrefix")}: {issues.join(", ")}.</p>
              </div>
            )}

            <div className="space-y-1 max-w-xs">
              <label className="text-[10px] font-black uppercase text-slate-500">{t("analysisFrequencyLabel")}</label>
              <select
                className="p-3 w-full rounded-xl shadow-sm border-none font-bold text-sm bg-white outline-none focus:ring-2 ring-blue-500"
                value={m.frequency}
                onChange={(e) => updateMaterial(m.id, "frequency", e.target.value)}
              >
                <option value="">{t("selectPlaceholder")}</option>
                {FREQUENCY_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{t(f.labelKey)}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-3">{t("technicalSheetLabel")}</label>
                {m.technicalSheet ? (
                  <FileChips files={[m.technicalSheet]} onRemove={() => removeTechnicalSheet(m.id)} />
                ) : (
                  <p className="text-xs text-slate-400 font-bold mb-3">{t("noFileUploaded")}</p>
                )}
                {!m.technicalSheet && <UploadButton label={t("uploadFileBtn")} onChange={(e) => handleUpload(m.id, "technicalSheet", e)} multiple={false} />}
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-3">{t("analysisReportsLabel")}</label>
                <FileChips files={m.analysisReports} onRemove={(url) => removeListFile(m.id, "analysisReports", url)} />
                <UploadButton label={t("uploadFileBtn")} onChange={(e) => handleUpload(m.id, "analysisReports", e)} multiple />
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">{t("riskMgmtLabel")}</label>
                <p className="text-[10px] font-bold text-slate-400 mb-3">{t("riskMgmtHint")}</p>
                <FileChips files={m.riskAssessment} onRemove={(url) => removeListFile(m.id, "riskAssessment", url)} />
                <UploadButton label={t("uploadFileBtn")} onChange={(e) => handleUpload(m.id, "riskAssessment", e)} multiple />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-500">{t("notes")}</label>
              <textarea
                className="w-full p-3 rounded-xl shadow-sm border-none font-bold text-sm bg-white outline-none focus:ring-2 ring-blue-500 resize-none h-20"
                value={m.notes || ""}
                onChange={(e) => updateMaterial(m.id, "notes", e.target.value)}
                placeholder={t("notesPlaceholder")}
              />
            </div>
          </div>
          );
        })}
        {materials.length === 0 && (
          <p className="text-sm font-bold text-slate-400 text-center py-10">{t("noRawMaterialsHint")}</p>
        )}
      </div>
    </div>
  );
}
