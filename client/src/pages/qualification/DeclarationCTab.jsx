import React from "react";
import { FileCheck2, Save, UploadCloud, Download, X } from "lucide-react";
import { useModal } from "../../hooks/useModal";
import { api } from "../../services/api";

// Valori fissi (non tradotti): come per il campo OGM e le presenze allergeni,
// devono restare stabili indipendentemente dalla lingua dell'interfaccia,
// altrimenti una risposta salvata in italiano non verrebbe piu' riconosciuta
// dopo un cambio lingua. Le etichette delle colonne sotto sono invece
// tradotte normalmente: solo il VALORE salvato resta fisso.
const ANSWER_OPTIONS = ["Sì", "No", "N/A"];

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

        {items.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-slate-300 shadow-sm">
            <table className="w-full border-collapse min-w-[960px]">
              <thead>
                <tr className="bg-rose-950 text-white">
                  <th className="p-3 text-[10px] font-black uppercase w-12">{t("declCColNo")}</th>
                  <th className="p-3 text-[10px] font-black uppercase text-left">{t("declCColQuestion")}</th>
                  <th className="p-3 text-[10px] font-black uppercase w-16">{t("declCColYes")}</th>
                  <th className="p-3 text-[10px] font-black uppercase w-16">{t("declCColAnswerNo")}</th>
                  <th className="p-3 text-[10px] font-black uppercase w-16">{t("declCColNA")}</th>
                  <th className="p-3 text-[10px] font-black uppercase w-64">{t("declCColNotes")}</th>
                  <th className="p-3 text-[10px] font-black uppercase w-40">{t("declCColAttachment")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((imp, idx) => {
                  const sectionKey = langKey === "it" ? "section" : `section_${langKey}`;
                  const questionText = imp[langKey] || imp.it || "";
                  const sectionText = (imp[sectionKey] || imp.section || "").trim();
                  const prevSectionKey = idx > 0 ? (langKey === "it" ? "section" : `section_${langKey}`) : null;
                  const prevSection = idx > 0 ? (items[idx - 1][prevSectionKey] || items[idx - 1].section || "").trim() : null;
                  const showSectionHeader = sectionText && sectionText !== prevSection;
                  const ans = getAnswer(imp.id);

                  return (
                    <React.Fragment key={imp.id}>
                      {showSectionHeader && (
                        <tr className="bg-amber-50">
                          <td colSpan={7} className="p-3 text-xs font-black uppercase text-amber-800 tracking-wide border-t-2 border-amber-300">
                            {sectionText}
                          </td>
                        </tr>
                      )}
                      <tr className="border-t border-slate-100 even:bg-slate-50/60 align-top">
                        <td className="p-3 text-center text-xs font-black text-slate-400">{idx + 1}</td>
                        <td className="p-3 text-xs font-bold text-slate-800 leading-relaxed">{questionText}</td>
                        {ANSWER_OPTIONS.map((opt) => (
                          <td key={opt} className="p-3 text-center">
                            <input
                              type="radio"
                              name={`declC-${imp.id}`}
                              checked={ans.answer === opt}
                              onChange={() => updateAnswer(imp.id, { answer: opt })}
                              className="w-4 h-4 accent-rose-800 cursor-pointer"
                            />
                          </td>
                        ))}
                        <td className="p-3">
                          <input
                            className="w-full p-2 rounded-lg border border-slate-200 font-bold text-xs bg-white outline-none focus:ring-2 ring-blue-400"
                            value={ans.notes || ""}
                            onChange={(e) => updateAnswer(imp.id, { notes: e.target.value })}
                            placeholder={t("notesPlaceholder")}
                          />
                        </td>
                        <td className="p-3">
                          {imp.allow_attachment ? (
                            <div className="space-y-1.5">
                              {(ans.files || []).map((f) => (
                                <div key={f.url} className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                                  <p className="text-[10px] text-blue-600 font-bold max-w-[100px] truncate" title={f.name}>{f.name}</p>
                                  <a href={f.url} download={f.name} className="text-blue-600 hover:text-emerald-600 shrink-0">
                                    <Download size={12} />
                                  </a>
                                  <button onClick={() => removeFile(imp.id, f.url)} className="text-slate-400 hover:text-red-600 shrink-0">
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                              <div className="relative overflow-hidden inline-block">
                                <button className="bg-slate-900 text-white rounded-lg px-3 py-1.5 font-black text-[9px] uppercase hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 pointer-events-none">
                                  <UploadCloud size={12} /> {t("uploadFileBtn")}
                                </button>
                                <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleUpload(imp.id, e)} />
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
