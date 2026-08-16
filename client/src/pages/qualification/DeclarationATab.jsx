import React, { useState } from "react";
import { AlertCircle, Save, Plus, Trash2 } from "lucide-react";
import { useModal } from "../../hooks/useModal";
import { api } from "../../services/api";

const NEW_IMPEGNO_PLACEHOLDER = { it: "Nuova dichiarazione...", en: "New declaration...", fr: "Nouvelle déclaration...", es: "Nueva declaración..." };

export default function DeclarationATab({ t, lang, qualData, setQualData, globalConfig, setGlobalConfig, isTestUser, saveImmediate }) {
  const { showConfirm, showAlert } = useModal();
  const langKey = lang.toLowerCase();
  const [savingTemplates, setSavingTemplates] = useState(false);

  const updateImpegno = (idx, checked) => {
    setQualData((prev) => {
      const impegni = Array.isArray(prev.fileA.impegni) ? [...prev.fileA.impegni] : [];
      impegni[idx] = checked;
      return { ...prev, fileA: { ...prev.fileA, impegni } };
    });
  };

  const updateAllergene = (idx, field, val) => {
    setQualData((prev) => ({
      ...prev,
      fileA: { ...prev.fileA, [field]: { ...prev.fileA[field], [idx]: val } },
    }));
  };

  // "Salva Modifiche" deve salvare tutto ciò che è visibile in questa sezione:
  // sia i template globali (nomi allergeni/impegni, editabili dal solo utente
  // TEST/DEMO e tenuti solo in memoria finché non si salva), sia le risposte
  // del fornitore per riga (stato/gestione/note, checkbox impegni), che
  // vivono in qualData e vanno salvate tramite saveImmediate.
  const saveTemplates = async () => {
    setSavingTemplates(true);
    try {
      const qualOk = await saveImmediate(qualData);
      if (!qualOk) return; // saveImmediate ha già mostrato l'errore
      await api.saveSettings({ templates: globalConfig });
      showAlert("Modifiche salvate con successo!");
    } catch (e) {
      showAlert(e.message || "Errore durante il salvataggio");
    } finally {
      setSavingTemplates(false);
    }
  };

  const updateGlobalImpegnoA = (idx, val) => {
    const newArr = [...(globalConfig.impegniA || [])];
    newArr[idx] = { ...newArr[idx], [langKey]: val };
    setGlobalConfig({ ...globalConfig, impegniA: newArr });
  };

  const addGlobalImpegnoA = () => {
    const newArr = [...(globalConfig.impegniA || []), { id: `impA_${Date.now()}`, it: "", en: "", fr: "", es: "" }];
    setGlobalConfig({ ...globalConfig, impegniA: newArr });
  };

  const removeGlobalImpegnoA = (idx) => {
    showConfirm("Eliminare questo impegno globalmente?", () => {
      setGlobalConfig({ ...globalConfig, impegniA: (globalConfig.impegniA || []).filter((_, i) => i !== idx) });
    });
  };

  const updateGlobalAllergen = (idx, val) => {
    const newArr = [...(globalConfig.allergeni || [])];
    newArr[idx] = { ...newArr[idx], [langKey]: val };
    setGlobalConfig({ ...globalConfig, allergeni: newArr });
  };

  const addGlobalAllergen = () => {
    const newArr = [...(globalConfig.allergeni || []), { id: Date.now(), it: "", en: "", fr: "", es: "" }];
    setGlobalConfig({ ...globalConfig, allergeni: newArr });
  };

  const removeGlobalAllergen = (idx) => {
    showConfirm("Eliminare questo allergene globalmente?", () => {
      setGlobalConfig({ ...globalConfig, allergeni: (globalConfig.allergeni || []).filter((_, i) => i !== idx) });
    });
  };

  const SaveTemplatesButton = () => (
    <div className="flex justify-end pt-6 mt-2 border-t border-slate-200">
      <button
        onClick={saveTemplates}
        disabled={savingTemplates}
        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
      >
        <Save size={16} />
        {savingTemplates ? "Salvataggio..." : "Salva Modifiche"}
      </button>
    </div>
  );

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <AlertCircle size={48} className="text-slate-900" />
          <h3 className="text-5xl font-black uppercase tracking-tighter text-slate-900">{t("tabDichiarazioneA")}</h3>
        </div>
        <button
          onClick={() => saveImmediate(qualData)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Save size={16} /> {t("save")}
        </button>
      </div>

      <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-200 shadow-inner">
        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-4 mb-8">
          <h4 className="text-2xl font-black uppercase text-slate-800">Dichiarazioni OGM, Etichettatura e Impegni Integrali</h4>
          {isTestUser && (
            <button onClick={addGlobalImpegnoA} className="text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-emerald-100 flex items-center gap-2">
              <Plus size={14} /> Aggiungi Impegno
            </button>
          )}
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
                {isTestUser ? (
                  <textarea
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 min-h-[60px] resize-none"
                    value={textValue}
                    onChange={(e) => updateGlobalImpegnoA(idx, e.target.value)}
                    placeholder={NEW_IMPEGNO_PLACEHOLDER[langKey] || NEW_IMPEGNO_PLACEHOLDER.it}
                  />
                ) : (
                  <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors leading-relaxed text-justify">{textValue}</span>
                )}
                {isTestUser && (
                  <button onClick={() => removeGlobalImpegnoA(idx)} className="absolute -right-2 -top-2 bg-red-100 text-red-600 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {isTestUser && <SaveTemplatesButton />}
      </div>

      <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-200 shadow-inner overflow-x-auto relative">
        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-4 mb-8">
          <h4 className="text-2xl font-black uppercase text-slate-800">Griglia Allergeni (Intero Stabilimento)</h4>
          {isTestUser && (
            <button onClick={addGlobalAllergen} className="text-blue-600 bg-blue-50 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-blue-100 flex items-center gap-2">
              <Plus size={14} /> Aggiungi Allergene
            </button>
          )}
        </div>
        <table className="w-full table-fixed text-left min-w-[800px]">
          <thead className="text-[10px] uppercase font-black text-slate-400">
            <tr>
              <th className="pb-4 px-2 w-[35%]">Allergene</th>
              <th className="pb-4 px-2 w-[20%]">Stato in Stabilimento</th>
              <th className="pb-4 px-2 w-[25%]">Gestione Preventiva / Rischio</th>
              <th className="pb-4 px-2 w-[20%]">Note Aggiuntive</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {(globalConfig.allergeni || []).map((all, idx) => (
              <tr key={all.id} className="hover:bg-slate-100 transition-colors group relative">
                <td className="py-4 px-2 text-xs font-bold leading-tight">
                  {isTestUser ? (
                    <div className="flex items-center gap-2">
                      <textarea
                        className="w-full min-w-0 p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 resize-none"
                        value={all[langKey] || all.it || ""}
                        onChange={(e) => updateGlobalAllergen(idx, e.target.value)}
                        placeholder="Nuovo Allergene"
                      />
                      <button onClick={() => removeGlobalAllergen(idx)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    all[langKey] || all.it
                  )}
                </td>
                <td className="py-4 px-2">
                  <select
                    className="w-full p-2 rounded-lg border border-slate-200 shadow-sm text-xs font-bold bg-white outline-none focus:border-blue-500"
                    value={qualData.fileA.allergeniPresence[idx] || "Assente"}
                    onChange={(e) => updateAllergene(idx, "allergeniPresence", e.target.value)}
                  >
                    <option value="Assente">Assente</option>
                    <option value="Presente (Linee separate)">Presente (Linee separate)</option>
                    <option value="Presente (Stessa linea)">Presente (Stessa linea)</option>
                    <option value="Presente (Altro reparto)">Presente (Altro reparto)</option>
                  </select>
                </td>
                <td className="py-4 px-2">
                  <select
                    className="w-full p-2 rounded-lg border border-slate-200 shadow-sm text-xs font-bold bg-white outline-none focus:border-blue-500"
                    value={qualData.fileA.allergeniGestione[idx] || "Non Applicabile"}
                    onChange={(e) => updateAllergene(idx, "allergeniGestione", e.target.value)}
                  >
                    <option value="Non Applicabile">Non Applicabile</option>
                    <option value="Separazione Temporale">Separazione Temporale</option>
                    <option value="Separazione Spaziale">Separazione Spaziale</option>
                    <option value="Sanificazione Validata">Sanificazione Validata</option>
                  </select>
                </td>
                <td className="py-4 px-2">
                  <input
                    type="text"
                    className="w-full p-2 rounded-lg border border-slate-200 shadow-sm text-xs font-bold bg-white outline-none focus:border-blue-500"
                    placeholder="Specificare note..."
                    value={qualData.fileA.allergeniNotes?.[idx] || ""}
                    onChange={(e) => updateAllergene(idx, "allergeniNotes", e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isTestUser && <SaveTemplatesButton />}
      </div>
    </div>
  );
}
