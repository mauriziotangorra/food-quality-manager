import React, { useEffect, useState } from "react";
import { ArrowLeft, PlusCircle, Edit3, Trash2, Save, FileText } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { useModal } from "../hooks/useModal";
import { api } from "../services/api";

const EMPTY_FORM = { id: null, name: "", status: "active", qualPass: "", techPass: "" };

const NEW_IMPEGNO_A = { id: null, it: "", en: "", fr: "", es: "" };
const NEW_IMPEGNO_C = { id: null, it: "", en: "", fr: "", es: "" };
const NEW_IMPEGNO_B = {
  id: null,
  title_it: "", desc_it: "",
  title_en: "", desc_en: "",
  title_fr: "", desc_fr: "",
  title_es: "", desc_es: "",
};
const NEW_ALLERGEN = { id: null, it: "", en: "", fr: "", es: "" };

export default function AdminPage({ onLogout }) {
  const { t } = useLanguage();
  const { showAlert, showConfirm } = useModal();

  const [view, setView] = useState("suppliers"); // 'suppliers' | 'declarations'

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);

  const [globalConfig, setGlobalConfig] = useState({ allergeni: [], impegniA: [], impegniB: [], impegniC: [] });
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [savingTemplates, setSavingTemplates] = useState(false);

  const loadSuppliers = () => {
    setLoading(true);
    api
      .getSuppliers()
      .then((data) => setSuppliers(data.suppliers || []))
      .catch(() => showAlert("Errore nel recupero dei fornitori"))
      .finally(() => setLoading(false));
  };

  const loadTemplates = () => {
    setLoadingTemplates(true);
    api
      .getSettings()
      .then((data) => {
        setGlobalConfig({
          allergeni: data?.settings?.templates?.allergeni || [],
          impegniA: data?.settings?.templates?.impegniA || [],
          impegniB: data?.settings?.templates?.impegniB || [],
          impegniC: data?.settings?.templates?.impegniC || [],
        });
      })
      .catch(() => showAlert("Errore nel recupero delle dichiarazioni"))
      .finally(() => setLoadingTemplates(false));
  };

  useEffect(() => {
    loadSuppliers();
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!form.name) return showAlert("Il nome del fornitore è obbligatorio");
    try {
      if (form.id) {
        await api.updateSupplier(form.id, {
          name: form.name,
          status: form.status,
          qualPass: form.qualPass || undefined,
          techPass: form.techPass || undefined,
        });
      } else {
        if (!form.qualPass || !form.techPass) {
          return showAlert("Password di qualifica e tecnica sono obbligatorie per un nuovo fornitore");
        }
        await api.createSupplier(form);
      }
      setForm(null);
      loadSuppliers();
    } catch (e) {
      showAlert(e.message || "Errore nel salvataggio del fornitore");
    }
  };

  const handleDelete = (supplier) => {
    showConfirm(`Eliminare il fornitore "${supplier.name}"? Verranno rimossi anche i suoi dati di qualifica.`, async () => {
      try {
        await api.deleteSupplier(supplier.id);
        loadSuppliers();
      } catch (e) {
        showAlert(e.message || "Errore nella cancellazione del fornitore");
      }
    });
  };

  // --- Gestione template (Dichiarazioni A/B/C, Griglia Allergeni) ---

  const updateList = (key, id, patch) => {
    setGlobalConfig((prev) => ({
      ...prev,
      [key]: prev[key].map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const addToList = (key, template) => {
    setGlobalConfig((prev) => ({
      ...prev,
      [key]: [...prev[key], { ...template, id: `${key}_${Date.now()}` }],
    }));
  };

  const removeFromList = (key, id, confirmMsg) => {
    showConfirm(confirmMsg, () => {
      setGlobalConfig((prev) => ({ ...prev, [key]: prev[key].filter((item) => item.id !== id) }));
    });
  };

  const saveTemplates = async () => {
    setSavingTemplates(true);
    try {
      await api.saveSettings({ templates: globalConfig });
      showAlert("Dichiarazioni salvate con successo!");
    } catch (e) {
      showAlert(e.message || "Errore durante il salvataggio delle dichiarazioni");
    } finally {
      setSavingTemplates(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex justify-between items-center">
          <h2 className="text-5xl font-black flex items-center gap-6">
            <button onClick={onLogout} className="p-4 bg-white rounded-3xl shadow hover:bg-slate-100 transition-all">
              <ArrowLeft size={32} />
            </button>
            {t("admin")}
          </h2>
          {view === "suppliers" && (
            <button
              onClick={() => setForm(EMPTY_FORM)}
              className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <PlusCircle size={20} /> Nuovo Fornitore
            </button>
          )}
          {view === "declarations" && (
            <button
              onClick={saveTemplates}
              disabled={savingTemplates}
              className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={20} /> {savingTemplates ? "Salvataggio..." : "Salva Dichiarazioni"}
            </button>
          )}
        </div>

        <div className="flex gap-2 bg-white/50 backdrop-blur p-2 rounded-[2.5rem] border border-slate-200 shadow-inner w-fit">
          <button
            onClick={() => setView("suppliers")}
            className={`py-4 px-8 rounded-[2rem] text-[10px] font-black uppercase transition-all ${
              view === "suppliers" ? "bg-slate-900 text-white shadow-xl" : "text-slate-400 hover:text-slate-800"
            }`}
          >
            Fornitori
          </button>
          <button
            onClick={() => setView("declarations")}
            className={`py-4 px-8 rounded-[2rem] text-[10px] font-black uppercase transition-all ${
              view === "declarations" ? "bg-slate-900 text-white shadow-xl" : "text-slate-400 hover:text-slate-800"
            }`}
          >
            Dichiarazioni
          </button>
        </div>

        {view === "suppliers" && (
          <>
            {form && (
              <div className="bg-white p-12 rounded-[4rem] shadow-2xl border-4 border-blue-100">
                <h3 className="text-2xl font-black mb-10 uppercase">{form.id ? "Modifica Profilo" : "Nuovo Profilo Fornitore"}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <input
                    placeholder="Ragione Sociale"
                    className="p-6 bg-slate-50 rounded-3xl font-bold border-none shadow-inner"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <input
                    placeholder={t("newQualPassword")}
                    className="p-6 bg-emerald-50 rounded-3xl font-mono border-none shadow-inner"
                    value={form.qualPass}
                    onChange={(e) => setForm({ ...form, qualPass: e.target.value })}
                  />
                  <input
                    placeholder={t("newTechPassword")}
                    className="p-6 bg-amber-50 rounded-3xl font-mono border-none shadow-inner"
                    value={form.techPass}
                    onChange={(e) => setForm({ ...form, techPass: e.target.value })}
                  />
                </div>
                <div className="mt-12 flex gap-6">
                  <button
                    onClick={handleSave}
                    className="bg-slate-900 text-white px-12 py-5 rounded-3xl font-black uppercase text-xs shadow-xl hover:bg-blue-600 transition-all"
                  >
                    Salva Database
                  </button>
                  <button onClick={() => setForm(null)} className="text-slate-400 font-black uppercase text-xs">
                    Annulla
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-[4rem] shadow-sm border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="p-10">Azienda</th>
                    <th className="p-10">Stato</th>
                    <th className="p-10 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {!loading && suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-10 font-black text-2xl uppercase tracking-tighter leading-none">{s.name}</td>
                      <td className="p-10 font-bold text-slate-500 uppercase text-xs">{s.status}</td>
                      <td className="p-10 text-right space-x-4">
                        <button
                          onClick={() => setForm({ id: s.id, name: s.name, status: s.status, qualPass: "", techPass: "" })}
                          className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"
                        >
                          <Edit3 size={24} />
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all"
                        >
                          <Trash2 size={24} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loading && suppliers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-10 text-center text-slate-400 font-bold">Nessun fornitore</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view === "declarations" && (
          <div className="space-y-12">
            {loadingTemplates ? (
              <div className="text-center text-slate-400 font-bold py-20">Caricamento...</div>
            ) : (
              <>
                {/* Dichiarazione A */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4 mb-8">
                    <h4 className="text-2xl font-black uppercase text-slate-800 flex items-center gap-3">
                      <FileText size={24} /> Dichiarazione A — OGM, Etichettatura e Impegni Integrali
                    </h4>
                    <button
                      onClick={() => addToList("impegniA", NEW_IMPEGNO_A)}
                      className="text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-emerald-100 flex items-center gap-2"
                    >
                      <PlusCircle size={14} /> Aggiungi Impegno
                    </button>
                  </div>
                  <div className="space-y-4">
                    {globalConfig.impegniA.map((imp) => (
                      <div key={imp.id} className="flex items-start gap-4 group bg-slate-50 p-5 rounded-2xl border border-slate-100 relative">
                        <textarea
                          className="w-full p-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 min-h-[60px] resize-none bg-white"
                          value={imp.it}
                          onChange={(e) => updateList("impegniA", imp.id, { it: e.target.value })}
                          placeholder="Testo della dichiarazione (italiano)..."
                        />
                        <button
                          onClick={() => removeFromList("impegniA", imp.id, "Eliminare questo impegno?")}
                          className="text-red-400 hover:text-red-600 shrink-0 p-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {globalConfig.impegniA.length === 0 && (
                      <p className="text-sm font-bold text-slate-400 text-center py-4">Nessun impegno presente.</p>
                    )}
                  </div>
                </div>

                {/* Dichiarazione B */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4 mb-8">
                    <h4 className="text-2xl font-black uppercase text-slate-800 flex items-center gap-3">
                      <FileText size={24} /> Dichiarazione B — Gestione Processi e Flussi Logistici
                    </h4>
                    <button
                      onClick={() => addToList("impegniB", NEW_IMPEGNO_B)}
                      className="text-blue-600 bg-blue-50 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-blue-100 flex items-center gap-2"
                    >
                      <PlusCircle size={14} /> Aggiungi Parametro
                    </button>
                  </div>
                  <div className="space-y-4">
                    {globalConfig.impegniB.map((imp) => (
                      <div key={imp.id} className="flex items-start gap-4 group bg-slate-50 p-5 rounded-2xl border border-slate-100 relative">
                        <div className="w-full space-y-2">
                          <input
                            className="w-full p-2 border border-slate-200 rounded-xl text-sm font-black text-slate-900 outline-none focus:border-blue-500 bg-white"
                            value={imp.title_it}
                            onChange={(e) => updateList("impegniB", imp.id, { title_it: e.target.value })}
                            placeholder="Titolo parametro (italiano)..."
                          />
                          <textarea
                            className="w-full p-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 min-h-[60px] resize-none bg-white"
                            value={imp.desc_it}
                            onChange={(e) => updateList("impegniB", imp.id, { desc_it: e.target.value })}
                            placeholder="Descrizione parametro (italiano)..."
                          />
                        </div>
                        <button
                          onClick={() => removeFromList("impegniB", imp.id, "Eliminare questo parametro?")}
                          className="text-red-400 hover:text-red-600 shrink-0 p-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {globalConfig.impegniB.length === 0 && (
                      <p className="text-sm font-bold text-slate-400 text-center py-4">Nessun parametro presente.</p>
                    )}
                  </div>
                </div>

                {/* Dichiarazione C */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4 mb-8">
                    <h4 className="text-2xl font-black uppercase text-slate-800 flex items-center gap-3">
                      <FileText size={24} /> Dichiarazione C
                    </h4>
                    <button
                      onClick={() => addToList("impegniC", NEW_IMPEGNO_C)}
                      className="text-amber-600 bg-amber-50 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-amber-100 flex items-center gap-2"
                    >
                      <PlusCircle size={14} /> Aggiungi Dichiarazione
                    </button>
                  </div>
                  <div className="space-y-4">
                    {globalConfig.impegniC.map((imp) => (
                      <div key={imp.id} className="flex items-start gap-4 group bg-slate-50 p-5 rounded-2xl border border-slate-100 relative">
                        <textarea
                          className="w-full p-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 min-h-[60px] resize-none bg-white"
                          value={imp.it}
                          onChange={(e) => updateList("impegniC", imp.id, { it: e.target.value })}
                          placeholder="Testo della dichiarazione (italiano)..."
                        />
                        <button
                          onClick={() => removeFromList("impegniC", imp.id, "Eliminare questa dichiarazione?")}
                          className="text-red-400 hover:text-red-600 shrink-0 p-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {globalConfig.impegniC.length === 0 && (
                      <p className="text-sm font-bold text-slate-400 text-center py-4">Nessuna dichiarazione presente.</p>
                    )}
                  </div>
                </div>

                {/* Griglia Allergeni */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4 mb-8">
                    <h4 className="text-2xl font-black uppercase text-slate-800 flex items-center gap-3">
                      <FileText size={24} /> Griglia Allergeni (Intero Stabilimento)
                    </h4>
                    <button
                      onClick={() => addToList("allergeni", NEW_ALLERGEN)}
                      className="text-purple-600 bg-purple-50 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-purple-100 flex items-center gap-2"
                    >
                      <PlusCircle size={14} /> Aggiungi Allergene
                    </button>
                  </div>
                  <div className="space-y-3">
                    {globalConfig.allergeni.map((all) => (
                      <div key={all.id} className="flex items-center gap-4 group bg-slate-50 p-4 rounded-2xl border border-slate-100 relative">
                        <input
                          className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-blue-500 bg-white"
                          value={all.it}
                          onChange={(e) => updateList("allergeni", all.id, { it: e.target.value })}
                          placeholder="Nome allergene (italiano)..."
                        />
                        <button
                          onClick={() => removeFromList("allergeni", all.id, "Eliminare questo allergene?")}
                          className="text-red-400 hover:text-red-600 shrink-0 p-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {globalConfig.allergeni.length === 0 && (
                      <p className="text-sm font-bold text-slate-400 text-center py-4">Nessun allergene presente.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
