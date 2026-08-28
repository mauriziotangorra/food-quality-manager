import React, { useEffect, useState } from "react";
import { ArrowLeft, PlusCircle, Edit3, Trash2, Save, FileText, Image as ImageIcon, UploadCloud, Download, Mail, Send } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { useModal } from "../hooks/useModal";
import { api } from "../services/api";

const EMPTY_FORM = { id: null, name: "", status: "active", qualPass: "", techPass: "" };

const NEW_IMPEGNO_A = { id: null, it: "", en: "", fr: "", es: "" };
const NEW_IMPEGNO_C = {
  id: null, it: "", en: "", fr: "", es: "",
  section: "", section_en: "", section_fr: "", section_es: "",
  allow_attachment: 0,
};
const NEW_IMPEGNO_B = {
  id: null,
  title_it: "", desc_it: "",
  title_en: "", desc_en: "",
  title_fr: "", desc_fr: "",
  title_es: "", desc_es: "",
};
const NEW_ALLERGEN = { id: null, it: "", en: "", fr: "", es: "" };

// Usato nell'editor del Questionario: un colore diverso per lingua rende piu'
// facile scorrere a colpo d'occhio le 4 versioni di ogni domanda.
const LANG_FIELDS = [
  { code: "IT", field: "it", sectionField: "section", color: "text-slate-400" },
  { code: "EN", field: "en", sectionField: "section_en", color: "text-blue-500" },
  { code: "FR", field: "fr", sectionField: "section_fr", color: "text-indigo-500" },
  { code: "ES", field: "es", sectionField: "section_es", color: "text-rose-500" },
];

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
  const [masterLogo, setMasterLogo] = useState(null);

  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) return;
    setSendingTestEmail(true);
    try {
      await api.sendTestEmail(testEmailAddress);
      showAlert(`Email di test inviata a ${testEmailAddress}. Controlla la casella (anche lo spam).`);
    } catch (e) {
      showAlert(e.message || "Errore durante l'invio dell'email di test.");
    } finally {
      setSendingTestEmail(false);
    }
  };

  const loadSuppliers = () => {
    setLoading(true);
    api
      .getSuppliers()
      .then((data) => setSuppliers(data.suppliers || []))
      .catch(() => showAlert(t("adminLoadSuppliersError")))
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
        setMasterLogo(data?.settings?.logo || null);
      })
      .catch(() => showAlert(t("adminLoadDeclarationsError")))
      .finally(() => setLoadingTemplates(false));
  };

  useEffect(() => {
    loadSuppliers();
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!form.name) return showAlert(t("adminSupplierNameRequired"));
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
          return showAlert(t("adminQualPassRequired"));
        }
        await api.createSupplier(form);
      }
      setForm(null);
      loadSuppliers();
      showAlert(t("adminSupplierSaved"));
    } catch (e) {
      showAlert(e.message || t("adminSaveSupplierError"));
    }
  };

  const handleDelete = (supplier) => {
    showConfirm(t("adminConfirmDeleteSupplier").replace("{name}", supplier.name), async () => {
      try {
        await api.deleteSupplier(supplier.id);
        loadSuppliers();
        showAlert(t("adminSupplierDeleted"));
      } catch (e) {
        showAlert(e.message || t("adminDeleteSupplierError"));
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
      showAlert(t("adminDeclarationsSaved"));
    } catch (e) {
      showAlert(e.message || t("adminSaveDeclarationsError"));
    } finally {
      setSavingTemplates(false);
    }
  };

  // --- Logo ufficiale (mostrato in home page e nei documenti generati) ---

  const handleMasterLogoUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const uploaded = await api.uploadFile("global", file);
      await api.saveSettings({ logo: uploaded.url });
      setMasterLogo(uploaded.url);
      showAlert(t("logoSaved"));
    } catch (err) {
      showAlert(err.message || t("logoUploadError"));
    }
  };

  const handleMasterLogoDelete = () => {
    showConfirm(t("logoDeleteConfirm"), async () => {
      try {
        if (masterLogo) await api.deleteUpload(masterLogo).catch(() => {});
        await api.saveSettings({ logo: null });
        setMasterLogo(null);
        showAlert(t("logoRemoved"));
      } catch (err) {
        showAlert(err.message || t("logoRemoveError"));
      }
    });
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
              <PlusCircle size={20} /> {t("adminNewSupplier")}
            </button>
          )}
          {view === "declarations" && (
            <button
              onClick={saveTemplates}
              disabled={savingTemplates}
              className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={20} /> {savingTemplates ? t("savingEllipsis") : t("adminSaveDeclarations")}
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
            {t("adminTabSuppliers")}
          </button>
          <button
            onClick={() => setView("declarations")}
            className={`py-4 px-8 rounded-[2rem] text-[10px] font-black uppercase transition-all ${
              view === "declarations" ? "bg-slate-900 text-white shadow-xl" : "text-slate-400 hover:text-slate-800"
            }`}
          >
            {t("adminTabDeclarations")}
          </button>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <Mail size={20} className="text-blue-600" />
            <span className="text-xs font-black uppercase text-slate-600 whitespace-nowrap">Test Email SMTP</span>
          </div>
          <input
            type="email"
            className="flex-1 p-3 bg-slate-50 rounded-xl font-bold text-sm border-none outline-none focus:ring-2 ring-blue-400"
            placeholder="tuaemail@esempio.it"
            value={testEmailAddress}
            onChange={(e) => setTestEmailAddress(e.target.value)}
          />
          <button
            onClick={handleSendTestEmail}
            disabled={sendingTestEmail || !testEmailAddress}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
          >
            <Send size={14} /> {sendingTestEmail ? "Invio in corso..." : "Invia Test"}
          </button>
        </div>

        {view === "suppliers" && (
          <>
            {form && (
              <div className="bg-white p-12 rounded-[4rem] shadow-2xl border-4 border-blue-100">
                <h3 className="text-2xl font-black mb-10 uppercase">{form.id ? t("adminEditProfile") : t("adminNewProfile")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <input
                    placeholder={t("rs")}
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
                    {t("adminSaveDb")}
                  </button>
                  <button onClick={() => setForm(null)} className="text-slate-400 font-black uppercase text-xs">
                    {t("cancel")}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-[4rem] shadow-sm border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <tr>
                    <th className="p-10">{t("adminCompanyCol")}</th>
                    <th className="p-10">{t("adminStatusCol")}</th>
                    <th className="p-10 text-right">{t("adminActionsCol")}</th>
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
                      <td colSpan={3} className="p-10 text-center text-slate-400 font-bold">{t("adminNoSuppliers")}</td>
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
              <div className="text-center text-slate-400 font-bold py-20">{t("loading")}</div>
            ) : (
              <>
                {/* Logo Ufficiale */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 border-b-2 border-slate-100 pb-4 mb-8">
                    <ImageIcon size={24} className="text-blue-600" />
                    <h4 className="text-2xl font-black uppercase text-slate-800">{t("officialLogo")}</h4>
                  </div>
                  <div className="relative group bg-slate-50 border-2 border-dashed p-10 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-100 transition-all max-w-sm">
                    {masterLogo ? (
                      <>
                        <img src={masterLogo} alt="Logo" className="h-16 object-contain" />
                        <div className="absolute top-4 right-4 flex gap-2 z-20">
                          <a href={masterLogo} download="master_logo" onClick={(e) => e.stopPropagation()} className="bg-white p-2 rounded-full shadow hover:text-emerald-600 text-slate-400 transition-all" title={t("downloadLogo")}>
                            <Download size={16} />
                          </a>
                          <button onClick={handleMasterLogoDelete} className="bg-white p-2 rounded-full shadow hover:text-red-600 text-slate-400 transition-all" title={t("deleteLogo")}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <UploadCloud size={48} className="text-slate-300" />
                    )}
                    <span className="text-[10px] font-black uppercase text-slate-400">{t("logoSetupHint")}</span>
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleMasterLogoUpload} />
                  </div>
                </div>

                {/* Dichiarazione A */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4 mb-8">
                    <h4 className="text-2xl font-black uppercase text-slate-800 flex items-center gap-3">
                      <FileText size={24} /> {t("declATitleAdmin")}
                    </h4>
                    <button
                      onClick={() => addToList("impegniA", NEW_IMPEGNO_A)}
                      className="text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-emerald-100 flex items-center gap-2"
                    >
                      <PlusCircle size={14} /> {t("addCommitment")}
                    </button>
                  </div>
                  <div className="space-y-4">
                    {globalConfig.impegniA.map((imp) => (
                      <div key={imp.id} className="flex items-start gap-4 group bg-slate-50 p-5 rounded-2xl border border-slate-100 relative">
                        <textarea
                          className="w-full p-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 min-h-[60px] resize-none bg-white"
                          value={imp.it}
                          onChange={(e) => updateList("impegniA", imp.id, { it: e.target.value })}
                          placeholder={t("declTextPlaceholderIt")}
                        />
                        <button
                          onClick={() => removeFromList("impegniA", imp.id, t("confirmDeleteCommitment"))}
                          className="text-red-400 hover:text-red-600 shrink-0 p-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {globalConfig.impegniA.length === 0 && (
                      <p className="text-sm font-bold text-slate-400 text-center py-4">{t("noCommitments")}</p>
                    )}
                  </div>
                </div>

                {/* Dichiarazione B */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4 mb-8">
                    <h4 className="text-2xl font-black uppercase text-slate-800 flex items-center gap-3">
                      <FileText size={24} /> {t("declBTitleAdmin")}
                    </h4>
                    <button
                      onClick={() => addToList("impegniB", NEW_IMPEGNO_B)}
                      className="text-blue-600 bg-blue-50 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-blue-100 flex items-center gap-2"
                    >
                      <PlusCircle size={14} /> {t("addParameter")}
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
                            placeholder={t("paramTitlePlaceholderIt")}
                          />
                          <textarea
                            className="w-full p-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 min-h-[60px] resize-none bg-white"
                            value={imp.desc_it}
                            onChange={(e) => updateList("impegniB", imp.id, { desc_it: e.target.value })}
                            placeholder={t("paramDescPlaceholderIt")}
                          />
                        </div>
                        <button
                          onClick={() => removeFromList("impegniB", imp.id, t("confirmDeleteParameter"))}
                          className="text-red-400 hover:text-red-600 shrink-0 p-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {globalConfig.impegniB.length === 0 && (
                      <p className="text-sm font-bold text-slate-400 text-center py-4">{t("noParameters")}</p>
                    )}
                  </div>
                </div>

                {/* Questionario (ex Dichiarazione C) */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4 mb-8">
                    <h4 className="text-2xl font-black uppercase text-slate-800 flex items-center gap-3">
                      <FileText size={24} /> {t("declCTitleAdmin")}
                    </h4>
                    <button
                      onClick={() => addToList("impegniC", NEW_IMPEGNO_C)}
                      className="text-amber-600 bg-amber-50 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-amber-100 flex items-center gap-2"
                    >
                      <PlusCircle size={14} /> {t("addDeclaration")}
                    </button>
                  </div>
                  <div className="space-y-5">
                    {globalConfig.impegniC.map((imp, idx) => (
                      <div key={imp.id} className="bg-slate-50 p-7 rounded-[2rem] border border-slate-200 hover:border-amber-200 transition-colors relative">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-black text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{t("declCTitleAdmin")}</span>
                          </div>
                          <button
                            onClick={() => removeFromList("impegniC", imp.id, t("confirmDeleteDeclaration"))}
                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl p-2 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="mb-6">
                          <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">{t("declCSectionPlaceholder")}</label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {LANG_FIELDS.map(({ code, sectionField, color }) => (
                              <div key={sectionField} className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all pl-1">
                                <span className={`text-[9px] font-black w-7 text-center shrink-0 ${color}`}>{code}</span>
                                <input
                                  className="w-full py-2.5 pr-3 text-[11px] font-black uppercase text-amber-700 outline-none bg-transparent"
                                  value={imp[sectionField] || ""}
                                  onChange={(e) => updateList("impegniC", imp.id, { [sectionField]: e.target.value })}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mb-6">
                          <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">{t("declTextPlaceholderIt")}</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {LANG_FIELDS.map(({ code, field, color }) => (
                              <div key={field} className="flex items-start gap-2 bg-white rounded-xl border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all pl-1">
                                <span className={`text-[9px] font-black w-7 text-center shrink-0 pt-3 ${color}`}>{code}</span>
                                <textarea
                                  className="w-full py-2.5 pr-3 text-xs font-bold text-slate-700 outline-none bg-transparent min-h-[72px] resize-none leading-relaxed"
                                  value={imp[field] || ""}
                                  onChange={(e) => updateList("impegniC", imp.id, { [field]: e.target.value })}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <label className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 cursor-pointer w-fit pt-4 border-t border-slate-200">
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-amber-600"
                            checked={Boolean(imp.allow_attachment)}
                            onChange={(e) => updateList("impegniC", imp.id, { allow_attachment: e.target.checked ? 1 : 0 })}
                          />
                          {t("declCAllowAttachment")}
                        </label>
                      </div>
                    ))}
                    {globalConfig.impegniC.length === 0 && (
                      <p className="text-sm font-bold text-slate-400 text-center py-4">{t("noDeclarations")}</p>
                    )}
                  </div>
                </div>

                {/* Griglia Allergeni */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4 mb-8">
                    <h4 className="text-2xl font-black uppercase text-slate-800 flex items-center gap-3">
                      <FileText size={24} /> {t("allergenGridTitleAdmin")}
                    </h4>
                    <button
                      onClick={() => addToList("allergeni", NEW_ALLERGEN)}
                      className="text-purple-600 bg-purple-50 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-purple-100 flex items-center gap-2"
                    >
                      <PlusCircle size={14} /> {t("addAllergen")}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {globalConfig.allergeni.map((all) => (
                      <div key={all.id} className="flex items-center gap-4 group bg-slate-50 p-4 rounded-2xl border border-slate-100 relative">
                        <input
                          className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:border-blue-500 bg-white"
                          value={all.it}
                          onChange={(e) => updateList("allergeni", all.id, { it: e.target.value })}
                          placeholder={t("allergenNamePlaceholderIt")}
                        />
                        <button
                          onClick={() => removeFromList("allergeni", all.id, t("confirmDeleteAllergen"))}
                          className="text-red-400 hover:text-red-600 shrink-0 p-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {globalConfig.allergeni.length === 0 && (
                      <p className="text-sm font-bold text-slate-400 text-center py-4">{t("noAllergens")}</p>
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
