import React from "react";
import { Database, Save, Plus, Trash2 } from "lucide-react";
import { useModal } from "../../hooks/useModal";

export default function ProductsTab({ t, qualData, setQualData, saveImmediate }) {
  const { showConfirm } = useModal();

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
            onClick={() => saveImmediate(qualData)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Save size={16} /> {t("save")}
          </button>
          <button
            onClick={addRow}
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus size={18} /> Aggiungi Articolo
          </button>
        </div>
      </div>
      <div className="bg-slate-50 rounded-[3rem] p-8 shadow-inner border border-slate-200 overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="text-[10px] uppercase font-black text-slate-400">
            <tr>
              <th className="p-4">Tipologia</th>
              <th className="p-4">Denominazione</th>
              <th className="p-4">Origine</th>
              <th className="p-4">Shelf Life</th>
              <th className="p-4 text-center">Rimuovi</th>
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
                    <option>Materia prima</option>
                    <option>Prodotto Finito</option>
                    <option>Imballaggio</option>
                    <option>Altro</option>
                  </select>
                </td>
                <td className="p-2">
                  <input
                    className="w-full p-4 rounded-xl border border-slate-100 shadow-sm bg-white font-bold text-xs"
                    value={p.denominazione || ""}
                    onChange={(e) => updateRow(p.id, "denominazione", e.target.value)}
                    placeholder="Nome commerciale"
                  />
                </td>
                <td className="p-2">
                  <input
                    className="w-full p-4 rounded-xl border border-slate-100 shadow-sm bg-white font-bold text-xs"
                    value={p.origine || ""}
                    onChange={(e) => updateRow(p.id, "origine", e.target.value)}
                    placeholder="Paese di origine"
                  />
                </td>
                <td className="p-2">
                  <input
                    className="w-full p-4 rounded-xl border border-slate-100 shadow-sm bg-white font-bold text-xs"
                    value={p.shelfLife || ""}
                    onChange={(e) => updateRow(p.id, "shelfLife", e.target.value)}
                    placeholder="Es. 24 mesi"
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
