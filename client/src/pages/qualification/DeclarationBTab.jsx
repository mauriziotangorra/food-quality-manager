import React from "react";
import { Truck, Save, Plus, Trash2 } from "lucide-react";
import { useModal } from "../../hooks/useModal";
import { api } from "../../services/api";

export default function DeclarationBTab({ t, lang, qualData, setQualData, globalConfig, setGlobalConfig, isTestUser, saveImmediate }) {
  const { showConfirm } = useModal();
  const langKey = lang.toLowerCase();

  const updateFileB = (id, checked) => {
    setQualData((prev) => ({ ...prev, fileB: { ...prev.fileB, [id]: checked } }));
  };

  const saveGlobalTemplates = async (nextConfig) => {
    setGlobalConfig(nextConfig);
    await api.saveSettings({ templates: nextConfig });
  };

  const updateGlobalImpegnoB = (id, field, val) => {
    const newArr = (globalConfig.impegniB || []).map((b) => (b.id === id ? { ...b, [field]: val } : b));
    saveGlobalTemplates({ ...globalConfig, impegniB: newArr });
  };

  const addGlobalImpegnoB = () => {
    const newArr = [
      ...(globalConfig.impegniB || []),
      {
        id: Date.now().toString(),
        title_it: "Nuovo Titolo",
        desc_it: "Descrizione...",
        title_en: "New Title",
        desc_en: "Description...",
        title_fr: "Nouveau Titre",
        desc_fr: "Description...",
        title_es: "Nuevo Título",
        desc_es: "Descripción...",
      },
    ];
    saveGlobalTemplates({ ...globalConfig, impegniB: newArr });
  };

  const removeGlobalImpegnoB = (id) => {
    showConfirm("Eliminare questo badge logistica globalmente?", () => {
      saveGlobalTemplates({ ...globalConfig, impegniB: (globalConfig.impegniB || []).filter((b) => b.id !== id) });
    });
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Truck size={48} className="text-slate-900" />
          <h3 className="text-5xl font-black uppercase tracking-tighter text-slate-900">{t("tabDichiarazioneB")}</h3>
        </div>
        <button
          onClick={() => saveImmediate(qualData)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Save size={16} /> {t("save")}
        </button>
      </div>
      <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-200 shadow-inner space-y-6">
        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-4 mb-6">
          <h4 className="text-2xl font-black uppercase text-slate-800">Gestione Processi e Flussi Logistici</h4>
          {isTestUser && (
            <button onClick={addGlobalImpegnoB} className="text-blue-600 bg-blue-50 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-blue-100 flex items-center gap-2">
              <Plus size={14} /> Aggiungi Parametro
            </button>
          )}
        </div>

        {(globalConfig.impegniB || []).map((imp) => (
          <label key={imp.id} className="flex items-start gap-5 cursor-pointer group bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-emerald-400 transition-all relative">
            <input
              type="checkbox"
              className="mt-1.5 w-6 h-6 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
              checked={qualData.fileB[imp.id] || false}
              onChange={(e) => updateFileB(imp.id, e.target.checked)}
            />
            <div className="w-full">
              {isTestUser ? (
                <>
                  <input
                    className="text-lg font-black text-slate-900 block mb-2 w-full border-b border-slate-200 focus:border-blue-500 outline-none pb-1"
                    value={imp[`title_${langKey}`] || imp.title_it || ""}
                    onChange={(e) => updateGlobalImpegnoB(imp.id, `title_${langKey}`, e.target.value)}
                    placeholder="Titolo parametro..."
                  />
                  <textarea
                    className="text-sm font-bold text-slate-500 w-full border rounded-lg p-2 focus:border-blue-500 outline-none min-h-[60px]"
                    value={imp[`desc_${langKey}`] || imp.desc_it || ""}
                    onChange={(e) => updateGlobalImpegnoB(imp.id, `desc_${langKey}`, e.target.value)}
                    placeholder="Descrizione parametro..."
                  />
                </>
              ) : (
                <>
                  <span className="text-lg font-black text-slate-900 block mb-2">{imp[`title_${langKey}`] || imp.title_it}</span>
                  <span className="text-sm font-bold text-slate-500 leading-relaxed block text-justify">{imp[`desc_${langKey}`] || imp.desc_it}</span>
                </>
              )}
            </div>
            {isTestUser && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  removeGlobalImpegnoB(imp.id);
                }}
                className="absolute right-4 top-4 text-red-300 hover:text-red-600 bg-red-50 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
