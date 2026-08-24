import React from "react";
import { ShieldAlert, Save, UploadCloud, Download, X, AlertTriangle } from "lucide-react";
import { useModal } from "../../hooks/useModal";
import { api } from "../../services/api";
import { getFoodFraudDefenseIssues, checkFoodFraudDefenseCompleteness } from "../../utils/completenessCheck";

const EMPTY_SECTION = { files: [], appliesTo: "" };

const Section = ({ title, sectionKey, section, t, handleUpload, removeFile, updateSection }) => {
  const issues = getFoodFraudDefenseIssues(section);
  const appliesToMissing = section.files.length > 0 && !section.appliesTo;
  return (
  <div className={`bg-slate-50 p-10 rounded-[3rem] border shadow-inner space-y-6 ${issues.length ? "border-amber-400" : "border-slate-200"}`}>
    <div className="border-b-2 border-slate-200 pb-4 mb-2">
      <h4 className="text-2xl font-black uppercase text-slate-800">{title}</h4>
    </div>

    {issues.length > 0 && (
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-2xl p-4">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs font-bold text-amber-800">{t("docIncompletePrefix")}: {issues.join(", ")}.</p>
      </div>
    )}

    <div className="space-y-2">
      {section.files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {section.files.map((f) => (
            <div key={f.url} className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
              <p className="text-xs text-blue-600 font-bold max-w-[220px] truncate" title={f.name}>{f.name}</p>
              <a href={f.url} download={f.name} className="text-blue-600 hover:text-emerald-600 bg-white p-1.5 rounded-lg shadow-sm transition-all">
                <Download size={13} />
              </a>
              <button onClick={() => removeFile(sectionKey, f.url)} className="text-slate-400 hover:text-red-600 bg-white p-1.5 rounded-lg shadow-sm transition-all">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      {section.files.length === 0 && <p className="text-xs text-slate-400 font-bold">{t("noFileUploaded")}</p>}
      <div className="relative overflow-hidden inline-block">
        <button className="bg-slate-900 text-white rounded-xl px-6 py-3 font-black text-xs uppercase hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center gap-2 pointer-events-none">
          <UploadCloud size={16} /> {t("uploadFileBtn")}
        </button>
        <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleUpload(sectionKey, e)} />
      </div>
    </div>

    <div className="space-y-1 max-w-md">
      <label className="text-[10px] font-black uppercase text-slate-500">
        {t("appliesTo")} {appliesToMissing && <span className="text-red-500">{t("appliesToRequired")}</span>}
      </label>
      <input
        className={`p-3 w-full rounded-xl shadow-sm font-bold text-sm bg-white outline-none focus:ring-2 ring-blue-500 border ${appliesToMissing ? "border-red-400" : "border-none"}`}
        value={section.appliesTo || ""}
        onChange={(e) => updateSection(sectionKey, { appliesTo: e.target.value })}
        placeholder={t("appliesToPlaceholder")}
      />
    </div>
  </div>
  );
};

export default function FoodFraudDefenseTab({ t, qualData, setQualData, supplierId, saveImmediate }) {
  const { showAlert, showConfirm } = useModal();
  const data = qualData.foodFraudDefense || { foodFraud: EMPTY_SECTION, foodDefense: EMPTY_SECTION };
  const fraud = data.foodFraud || EMPTY_SECTION;
  const defense = data.foodDefense || EMPTY_SECTION;

  const updateSection = (key, patch) => {
    setQualData((prev) => ({
      ...prev,
      foodFraudDefense: {
        ...prev.foodFraudDefense,
        [key]: { ...(prev.foodFraudDefense?.[key] || EMPTY_SECTION), ...patch },
      },
    }));
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
      const currentFiles = (key === "foodFraud" ? fraud : defense).files;
      const nextFiles = [...currentFiles, ...uploaded];
      const nextQualData = {
        ...qualData,
        foodFraudDefense: { ...qualData.foodFraudDefense, [key]: { ...(qualData.foodFraudDefense?.[key] || EMPTY_SECTION), files: nextFiles } },
      };
      setQualData(nextQualData);
      const ok = await saveImmediate(nextQualData);
      if (ok) showAlert(t("alertSaved"));
    } catch (err) {
      showAlert(err.message || t("alertFileSize"));
    }
  };

  const removeFile = (key, fileUrl) => {
    showConfirm(t("alertDeletePrompt"), () => {
      api.deleteUpload(fileUrl).catch(() => {});
      const currentFiles = (key === "foodFraud" ? fraud : defense).files;
      const nextFiles = currentFiles.filter((f) => f.url !== fileUrl);
      const nextQualData = {
        ...qualData,
        foodFraudDefense: { ...qualData.foodFraudDefense, [key]: { ...(qualData.foodFraudDefense?.[key] || EMPTY_SECTION), files: nextFiles } },
      };
      setQualData(nextQualData);
      saveImmediate(nextQualData);
    });
  };


  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <ShieldAlert size={48} className="text-slate-900" />
          <h3 className="text-5xl font-black uppercase tracking-tighter text-slate-900">{t("tabFoodFraudDefense")}</h3>
        </div>
        <button
          onClick={async () => {
            const completeness = checkFoodFraudDefenseCompleteness(qualData);
            if (!completeness.ok) return showAlert(completeness.message);
            const ok = await saveImmediate(qualData);
            if (ok) showAlert(t("alertSaved"));
          }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Save size={16} /> {t("save")}
        </button>
      </div>

      <Section title={t("foodFraudLabel")} sectionKey="foodFraud" section={fraud} t={t} updateSection={updateSection} handleUpload={handleUpload} removeFile={removeFile} />
      <Section title={t("foodDefenseLabel")} sectionKey="foodDefense" section={defense} t={t} updateSection={updateSection} handleUpload={handleUpload} removeFile={removeFile} />
    </div>
  );
}
