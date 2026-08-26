import React from "react";
import { FileCheck2, Save, UploadCloud, Download, X } from "lucide-react";
import { useModal } from "../../hooks/useModal";
import { api } from "../../services/api";

// Valori fissi (non tradotti): come per il campo OGM e le presenze allergeni,
// devono restare stabili indipendentemente dalla lingua dell'interfaccia,
// altrimenti una risposta salvata in italiano non verrebbe piu' riconosciuta
// dopo un cambio lingua.
const ANSWER_OPTIONS = ["Sì", "No", "N/A"];

const ANSWER_STYLE = {
  "Sì": "bg-emerald-600 border-emerald-600 text-white",
  "No": "bg-red-600 border-red-600 text-white",
  "N/A": "bg-slate-600 border-slate-600 text-white",
};

const EMPTY_ANSWER = { answer: "", notes: "", files: [] };

export default function DeclarationCTab({ t, lang, qualData, setQualData, globalConfig, supplierId, saveImmediate }) {
  const { showAlert, showConfirm } = useModal();
  const langKey = lang.toLowerCase();
  const answers = qualData.fileD?.answers || {};
  const items = globalConfig.impegniC || [];

  const getAnswer = (id) => answers[id] || EMPTY_ANSWER;

  const updateAnswer = (id, patch) => {
    setQualData((prev) => ({
      ...prev,
      fileD: {
        ...prev.fileD,
        answers: { ...(prev.fileD?.answers || {}), [id]: { ...getAnswer(id), ...patch } },
      },
    }));
  };

  const handleUpload = async (id, e) => {
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
      const current = getAnswer(id);
      const nextAnswers = { ...answers, [id]: { ...current, files: [...(current.files || []), ...uploaded] } };
      const next = { ...qualData, fileD: { ...qualData.fileD, answers: nextAnswers } };
      setQualData(next);
      const ok = await saveImmediate(next);
      if (ok) showAlert(t("alertSaved"));
    } catch (err) {
      showAlert(err.message || t("alertFileSize"));
    }
  };

  const removeFile = (id, fileUrl) => {
    showConfirm(t("alertDeletePrompt"), () => {
      api.deleteUpload(fileUrl).catch(() => {});
      const current = getAnswer(id);
      const nextAnswers = { ...answers, [id]: { ...current, files: (current.files || []).filter((f) => f.url !== fileUrl) } };
      const next = { ...qualData, fileD: { ...qualData.fileD, answers: nextAnswers } };
      setQualData(next);
      saveImmediate(next);
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

      <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-200 shadow-inner space-y-6">
        <div className="border-b-2 border-slate-200 pb-4">
          <h4 className="text-2xl font-black uppercase text-slate-800">{t("declCSimpleTitle")}</h4>
        </div>

        {items.length === 0 && (
          <p className="text-sm font-bold text-slate-400 text-center py-6">{t("noDeclarationsAtMoment")}</p>
        )}

        <div className="space-y-6">
          {items.map((imp, idx) => {
            const questionText = imp[langKey] || imp.it || "";
            const sectionText = (imp.section || "").trim();
            const prevSection = idx > 0 ? (items[idx - 1].section || "").trim() : null;
            const showSectionHeader = sectionText && sectionText !== prevSection;
            const ans = getAnswer(imp.id);

            return (
              <React.Fragment key={imp.id}>
                {showSectionHeader && (
                  <h5 className="text-sm font-black uppercase text-amber-600 tracking-wide pt-4 mt-4 border-t-2 border-amber-200 first:border-t-0 first:pt-0 first:mt-0">
                    {sectionText}
                  </h5>
                )}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <p className="text-sm font-bold text-slate-800 leading-relaxed">{questionText}</p>

                  <div className="flex flex-wrap gap-2">
                    {ANSWER_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => updateAnswer(imp.id, { answer: opt })}
                        className={`px-5 py-2 rounded-xl text-xs font-black uppercase border-2 transition-colors ${
                          ans.answer === opt ? ANSWER_STYLE[opt] : "bg-white border-slate-200 text-slate-400 hover:border-slate-400"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  <input
                    className="w-full p-3 rounded-xl shadow-sm border-none font-bold text-sm bg-slate-50 outline-none focus:ring-2 ring-blue-500"
                    value={ans.notes || ""}
                    onChange={(e) => updateAnswer(imp.id, { notes: e.target.value })}
                    placeholder={t("notesPlaceholder")}
                  />

                  {Boolean(imp.allow_attachment) && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      {(ans.files || []).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {ans.files.map((f) => (
                            <div key={f.url} className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                              <p className="text-xs text-blue-600 font-bold max-w-[220px] truncate" title={f.name}>{f.name}</p>
                              <a href={f.url} download={f.name} className="text-blue-600 hover:text-emerald-600 bg-white p-1.5 rounded-lg shadow-sm transition-all">
                                <Download size={13} />
                              </a>
                              <button onClick={() => removeFile(imp.id, f.url)} className="text-slate-400 hover:text-red-600 bg-white p-1.5 rounded-lg shadow-sm transition-all">
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {(ans.files || []).length === 0 && <p className="text-xs text-slate-400 font-bold">{t("noFileUploaded")}</p>}
                      <div className="relative overflow-hidden inline-block">
                        <button className="bg-slate-900 text-white rounded-xl px-5 py-2.5 font-black text-[11px] uppercase hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center gap-2 pointer-events-none">
                          <UploadCloud size={15} /> {t("uploadFileBtn")}
                        </button>
                        <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleUpload(imp.id, e)} />
                      </div>
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
