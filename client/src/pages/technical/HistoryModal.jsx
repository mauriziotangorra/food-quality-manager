import React from "react";
import { History, X, Calendar, FileDown, FileText, Image as ImageIcon, Download } from "lucide-react";

export default function HistoryModal({ spec, productSpecs, t, onClose, onGeneratePdf }) {
  if (!spec) return null;

  const family = productSpecs
    .filter(
      (s) =>
        (s.familyId && s.familyId === spec.familyId) ||
        (!s.familyId && s.master?.codice && s.master.codice === spec.master?.codice) ||
        (!s.familyId && !s.master?.codice && s.master?.nome === spec.master?.nome)
    )
    .sort((a, b) => (b.header.revision || 0) - (a.header.revision || 0));

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] p-8 max-w-3xl w-full shadow-2xl animate-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <History className="text-blue-600" /> {t("historyTitle")}: {spec.master?.nome || "Prodotto"}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {family.map((hSpec) => (
            <div key={hSpec.id} className="flex flex-col p-5 border rounded-2xl bg-slate-50 hover:bg-white hover:shadow-md transition-all gap-4">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-6">
                  <div className="bg-slate-200 w-12 h-12 rounded-full flex items-center justify-center font-black text-slate-500">
                    {hSpec.header.revision || 0}
                  </div>
                  <div>
                    <span className="font-black text-sm uppercase text-slate-800 block">Revisione {hSpec.header.revision || 0}</span>
                    <span className="text-xs font-bold text-slate-500 block mt-1 flex items-center gap-1">
                      <Calendar size={12} /> Data salvataggio: {hSpec.saveDate || "N/D"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${hSpec.isObsolete ? "bg-red-100 text-red-700 border border-red-200" : "bg-emerald-100 text-emerald-700 border border-emerald-200"}`}>
                    {hSpec.isObsolete ? t("statusArchived") : "ATTIVA"}
                  </span>
                  <button onClick={() => onGeneratePdf(hSpec)} className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition flex items-center gap-2 text-xs font-black uppercase">
                    <FileDown size={16} /> {t("exportPdf")}
                  </button>
                </div>
              </div>

              {((hSpec.attachedSheets && hSpec.attachedSheets.length > 0) || (hSpec.photos && hSpec.photos.length > 0)) && (
                <div className="pt-3 border-t border-slate-200">
                  <span className="text-[10px] font-black text-slate-500 uppercase block mb-3">{t("attachedFiles")}</span>
                  <div className="flex flex-wrap gap-2">
                    {(hSpec.attachedSheets || []).map((file, idx) => (
                      <a key={`h-sheet-${idx}`} href={file.url} download={file.name} className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors group shadow-sm">
                        <FileText size={14} className="text-blue-500" />
                        <span className="text-[10px] font-bold text-slate-600 truncate max-w-[200px] group-hover:text-blue-700">{file.name}</span>
                        <Download size={12} className="text-slate-400 group-hover:text-blue-600 ml-1" />
                      </a>
                    ))}
                    {(hSpec.photos || []).map((file, idx) => (
                      <a key={`h-photo-${idx}`} href={file.url} download={file.name} className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors group shadow-sm">
                        <ImageIcon size={14} className="text-purple-500" />
                        <span className="text-[10px] font-bold text-slate-600 truncate max-w-[200px] group-hover:text-purple-700">{file.name}</span>
                        <Download size={12} className="text-slate-400 group-hover:text-purple-600 ml-1" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
