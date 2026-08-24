import React, { useState } from "react";
import { Database, Save, Plus, Trash2 } from "lucide-react";
import { useModal } from "../../hooks/useModal";

export default function ProductsTab({ t, qualData, setQualData, saveImmediate }) {
  const { showConfirm, showAlert } = useModal();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const ok = await saveImmediate(qualData);
      if (ok) showAlert(t("productsSaved"));
      // se ok è false, saveImmediate ha già mostrato l'errore
    } finally {
      setSaving(false);
    }
  };

  const updateRow = (id, field, val) => {
    setQualData((prev) => ({ ...prev, fileC: prev.fileC.map((p) => (p.id === id ? { ...p, [field]: val } : p)) }));
  };

  const addRow = () => {
    setQualData((prev) => ({
      ...prev,
      fileC: [...prev.fileC, { id: Date.now(), tipologia: "Materia prima", denominazione: "", origine: "", shelfLife: "" }],
    }));
  };

  const removeRow = (id) => {
    showConfirm(t("alertDeletePrompt"), () => {
      setQualData((prev) => {
        const next = { ...prev, fileC: prev.fileC.filter((p) => p.id !== id) };
        saveImmediate(next);
        return next;
      });
    });
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
        <div className="flex items-center gap-6">
          <Database size={48} className="text-slate-900" />
          <h3 className="text-5xl font-black uppercase tracking-tighter text-slate-900">{t("tabProdotti")}</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Save size={16} /> {saving ? t("savingEllipsis") : t("saveProducts")}
          </button>
          <button
            onClick={addRow}
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus size={18} /> {t("addArticle")}
          </button>
        </div>
      </div>
      <div className="bg-slate-50 rounded-[3rem] p-8 shadow-inner border border-slate-200 overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="text-[10px] uppercase font-black text-slate-400">
            <tr>
              <th className="p-4">{t("typology")}</th>
              <th className="p-4">{t("colDenominazione")}</th>
              <th className="p-4">{t("labelOrigine")}</th>
              <th className="p-4">{t("labelTmc")}</th>
              <th className="p-4 text-center">{t("colRemove")}</th>
            </tr>
          </thead>
          <tbody className="text-slate-900 space-y-2">
            {(qualData.fileC || []).map((p) => (
              <tr key={p.id} className="bg-white border-b-8 border-slate-50">
                <td className="p-2 rounded-l-2xl">
                  <select
                    className="w-full p-4 rounded-xl border border-slate-100 shadow-sm bg-white font-bold text-xs"
                    value={p.tipologia || "Materia prima"}
                    onChange={(e) => updateRow(p.id, "tipologia", e.target.value)}
                  >
                    <option value="Materia prima">{t("tipMateriaPrima")}</option>
                    <option value="Prodotto Finito">{t("tipProdottoFinito")}</option>
                    <option value="Imballaggio">{t("tipImballaggio")}</option>
                    <option value="Altro">{t("tipAltro")}</option>
                  </select>
                </td>
                <td className="p-2">
                  <input
                    className="w-full p-4 rounded-xl border border-slate-100 shadow-sm bg-white font-bold text-xs"
                    value={p.denominazione || ""}
                    onChange={(e) => updateRow(p.id, "denominazione", e.target.value)}
                    placeholder={t("commercialNamePlaceholder")}
                  />
                </td>
                <td className="p-2">
                  <input
                    className="w-full p-4 rounded-xl border border-slate-100 shadow-sm bg-white font-bold text-xs"
                    value={p.origine || ""}
                    onChange={(e) => updateRow(p.id, "origine", e.target.value)}
                    placeholder={t("originCountryPlaceholder")}
                  />
                </td>
                <td className="p-2">
                  <input
                    className="w-full p-4 rounded-xl border border-slate-100 shadow-sm bg-white font-bold text-xs"
                    value={p.shelfLife || ""}
                    onChange={(e) => updateRow(p.id, "shelfLife", e.target.value)}
                    placeholder={t("shelfLifePlaceholder")}
                  />
                </td>
                <td className="p-2 rounded-r-2xl text-center">
                  <button onClick={() => removeRow(p.id)} className="text-slate-300 hover:text-red-500 bg-slate-50 p-3 rounded-xl transition-colors">
                    <Trash2 size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
