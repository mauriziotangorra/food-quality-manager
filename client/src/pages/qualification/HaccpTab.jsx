import React from "react";
import { ClipboardCheck, Save, UploadCloud, Download, X, AlertTriangle, Info } from "lucide-react";
import { useModal } from "../../hooks/useModal";
import { api } from "../../services/api";
import { getHaccpSlotIssues, checkHaccpCompleteness } from "../../utils/completenessCheck";

const EMPTY_HACCP = { manualExtract: [], flowChart: [], prp: [], oprpCcp: [] };

const MANUAL_EXTRACT = { keys: ["manualExtract"], labelKey: "haccpManualExtractLabel", descKey: "haccpManualExtractDesc" };
const FLOW_CHART = { keys: ["flowChart"], labelKey: "haccpFlowChartLabel", descKey: "haccpFlowChartDesc" };
// PRP e OPRP/CCP ora sono un'unica area di upload (richiesto dal cliente: "put
// them together, still with the option to add more than one PDF"). I file
// restano fisicamente sotto le chiavi "prp"/"oprpCcp" — nessuna migrazione
// dati necessaria, i file gia' caricati da fornitori esistenti restano
// visibili — ma vengono mostrati e caricati come un'unica lista combinata. I
// nuovi upload vanno sempre sotto la prima chiave ("prp").
const PRP_OPRP_CCP = { keys: ["prp", "oprpCcp"], labelKey: "haccpPrpOprpLabel", descKey: "haccpPrpOprpDesc" };

const CARDS = [[MANUAL_EXTRACT], [FLOW_CHART], [PRP_OPRP_CCP]];

export default function HaccpTab({ t, qualData, setQualData, supplierId, saveImmediate }) {
  const { showAlert, showConfirm } = useModal();
  const haccp = { ...EMPTY_HACCP, ...(qualData.haccp || {}) };

  const handleUpload = async (key, e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    try {
      const uploaded = [];
      for (const file of files) {
        // eslint-disable-next-line no-await-in-loop
        const res = await api.uploadFile(supplierId, file);
        uploaded.push({ name: res.name, url: res.url, appliesTo: "" });
      }
      const next = { ...qualData, haccp: { ...haccp, [key]: [...haccp[key], ...uploaded] } };
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
      const next = { ...qualData, haccp: { ...haccp, [key]: haccp[key].filter((f) => f.url !== fileUrl) } };
      setQualData(next);
      saveImmediate(next);
    });
  };

  const updateAppliesTo = (key, fileUrl, value) => {
    const next = { ...qualData, haccp: { ...haccp, [key]: haccp[key].map((f) => (f.url === fileUrl ? { ...f, appliesTo: value } : f)) } };
    setQualData(next);
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
        <div className="flex items-center gap-6">
          <ClipboardCheck size={48} className="text-slate-900" />
          <h3 className="text-5xl font-black uppercase tracking-tighter text-slate-900">{t("tabHaccp")}</h3>
        </div>
        <button
          onClick={async () => {
            const completeness = checkHaccpCompleteness(qualData);
            if (!completeness.ok) return showAlert(completeness.message);
            const ok = await saveImmediate(qualData);
            if (ok) showAlert(t("alertSaved"));
          }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Save size={16} /> {t("save")}
        </button>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs font-bold text-blue-800 leading-relaxed">{t("haccpInfoHint")}</p>
      </div>

      <div className="space-y-8">
        {CARDS.map((slots) => {
          const cardHasIssues = slots.some((slot) => slot.keys.some((k) => getHaccpSlotIssues(haccp[k] || []).length > 0));
          return (
            <div
              key={slots.map((s) => s.keys.join("+")).join("|")}
              className={`bg-slate-50 p-10 rounded-[3rem] border shadow-inner space-y-6 ${cardHasIssues ? "border-amber-400" : "border-slate-200"}`}
            >
              {slots.map((slot, idx) => {
                const files = slot.keys.flatMap((k) => (haccp[k] || []).map((f) => ({ ...f, _sourceKey: k })));
                const issues = slot.keys.flatMap((k) => getHaccpSlotIssues(haccp[k] || []));
                const uploadKey = slot.keys[0];
                return (
                  <div key={slot.keys.join("+")} className={`space-y-6 ${idx > 0 ? "pt-6 border-t border-slate-200" : ""}`}>
                    <div className="border-b-2 border-slate-200 pb-4">
                      <h4 className="text-2xl font-black uppercase text-slate-800">{t(slot.labelKey)}</h4>
                      <p className="text-xs font-bold text-slate-400 mt-2">{t(slot.descKey)}</p>
                    </div>

                    {issues.length > 0 && (
                      <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-2xl p-4">
                        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-amber-800">{t("docIncompletePrefix")}: {issues.join(", ")}.</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      {files.map((f) => (
                        <div key={f.url} className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <p className="text-xs text-slate-700 font-bold truncate" title={f.name}>{f.name}</p>
                            <a href={f.url} download={f.name} className="text-blue-600 hover:text-emerald-600 bg-blue-50 p-1.5 rounded-lg shadow-sm transition-all shrink-0">
                              <Download size={13} />
                            </a>
                            <button onClick={() => removeFile(f._sourceKey, f.url)} className="text-slate-400 hover:text-red-600 bg-slate-50 p-1.5 rounded-lg shadow-sm transition-all shrink-0">
                              <X size={13} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 md:w-80 shrink-0">
                            <label className="text-[10px] font-black uppercase text-slate-500 whitespace-nowrap">
                              {t("appliesTo")}{!f.appliesTo && <span className="text-red-500"> {t("appliesToRequired")}</span>}
                            </label>
                            <input
                              className={`flex-1 p-2 rounded-lg text-xs font-bold bg-white outline-none focus:ring-2 ring-blue-500 border ${!f.appliesTo ? "border-red-400" : "border-slate-200"}`}
                              value={f.appliesTo || ""}
                              onChange={(e) => updateAppliesTo(f._sourceKey, f.url, e.target.value)}
                              placeholder={t("appliesToApplyPlaceholder")}
                            />
                          </div>
                        </div>
                      ))}
                      {files.length === 0 && <p className="text-xs text-slate-400 font-bold">{t("noFileUploaded")}</p>}
                    </div>

                    <div className="relative overflow-hidden inline-block">
                      <button className="bg-slate-900 text-white rounded-xl px-6 py-3 font-black text-xs uppercase hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center gap-2 pointer-events-none">
                        <UploadCloud size={16} /> {t("uploadFileBtn")}
                      </button>
                      <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleUpload(uploadKey, e)} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
