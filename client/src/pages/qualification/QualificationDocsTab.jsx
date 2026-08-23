import React from "react";
import { FolderKanban, Save, Plus, UploadCloud, Download, Trash2, X, AlertTriangle } from "lucide-react";
import { useModal } from "../../hooks/useModal";
import { api } from "../../services/api";
import { getQualificationDocIssues, checkQualificationDocsCompleteness } from "../../utils/completenessCheck";

export default function QualificationDocsTab({ t, qualData, setQualData, supplierId, saveImmediate }) {
  const { showAlert, showConfirm } = useModal();
  const docs = qualData.qualificationDocs || [];

  const updateDocs = (next) => setQualData((prev) => ({ ...prev, qualificationDocs: next }));

  const addDoc = () => {
    updateDocs([...docs, { id: Date.now().toString(), name: "", files: [], note: "", date: "" }]);
  };

  const updateDoc = (id, field, val) => {
    updateDocs(docs.map((d) => (d.id === id ? { ...d, [field]: val } : d)));
  };

  const removeDoc = (id) => {
    showConfirm(t("alertDeletePrompt"), () => {
      const next = docs.filter((d) => d.id !== id);
      updateDocs(next);
      saveImmediate({ ...qualData, qualificationDocs: next });
    });
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
      const next = docs.map((d) => (d.id === id ? { ...d, files: [...d.files, ...uploaded] } : d));
      updateDocs(next);
      const ok = await saveImmediate({ ...qualData, qualificationDocs: next });
      if (ok) showAlert(t("alertSaved"));
    } catch (err) {
      showAlert(err.message || t("alertFileSize"));
    }
  };

  const removeFile = (docId, fileUrl) => {
    showConfirm(t("alertDeletePrompt"), () => {
      api.deleteUpload(fileUrl).catch(() => {});
      const next = docs.map((d) => (d.id === docId ? { ...d, files: d.files.filter((f) => f.url !== fileUrl) } : d));
      updateDocs(next);
      saveImmediate({ ...qualData, qualificationDocs: next });
    });
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
        <div className="flex items-center gap-6">
          <FolderKanban size={48} className="text-slate-900" />
          <h3 className="text-5xl font-black uppercase tracking-tighter text-slate-900">{t("tabDocumentazione")}</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              const completeness = checkQualificationDocsCompleteness(qualData);
              if (!completeness.ok) return showAlert(completeness.message);
              const ok = await saveImmediate(qualData);
              if (ok) showAlert(t("alertSaved"));
            }}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Save size={16} /> {t("save")}
          </button>
          <button
            onClick={addDoc}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus size={16} /> Aggiungi Documento
          </button>
        </div>
      </div>

      <div className="space-y-6 text-slate-900">
        {docs.map((doc) => {
          const issues = getQualificationDocIssues(doc);
          return (
          <div key={doc.id} className={`bg-slate-50 p-8 rounded-[2rem] border shadow-inner space-y-6 ${issues.length ? "border-amber-400" : "border-slate-200"}`}>
            <div className="flex items-start justify-between gap-4">
              <input
                className="text-2xl font-black uppercase text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none w-full"
                value={doc.name}
                onChange={(e) => updateDoc(doc.id, "name", e.target.value)}
                placeholder="Nome Documento"
              />
              <button onClick={() => removeDoc(doc.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0">
                <Trash2 size={20} />
              </button>
            </div>

            {issues.length > 0 && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-2xl p-4">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-amber-800">Documentazione incompleta: {issues.join(", ")}.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500">Data</label>
                <input
                  type="date"
                  className="p-3 w-full rounded-xl shadow-sm border-none font-bold text-sm bg-white outline-none focus:ring-2 ring-blue-500"
                  value={doc.date || ""}
                  onChange={(e) => updateDoc(doc.id, "date", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500">Note</label>
                <input
                  className="p-3 w-full rounded-xl shadow-sm border-none font-bold text-sm bg-white outline-none focus:ring-2 ring-blue-500"
                  value={doc.note || ""}
                  onChange={(e) => updateDoc(doc.id, "note", e.target.value)}
                  placeholder="Note aggiuntive..."
                />
              </div>
            </div>

            <div className="space-y-2">
              {doc.files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {doc.files.map((f) => (
                    <div key={f.url} className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                      <p className="text-xs text-blue-600 font-bold max-w-[220px] truncate" title={f.name}>{f.name}</p>
                      <a href={f.url} download={f.name} className="text-blue-600 hover:text-emerald-600 bg-white p-1.5 rounded-lg shadow-sm transition-all">
                        <Download size={13} />
                      </a>
                      <button onClick={() => removeFile(doc.id, f.url)} className="text-slate-400 hover:text-red-600 bg-white p-1.5 rounded-lg shadow-sm transition-all">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative overflow-hidden inline-block">
                <button className="bg-slate-900 text-white rounded-xl px-6 py-3 font-black text-xs uppercase hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center gap-2 pointer-events-none">
                  <UploadCloud size={16} /> Carica File
                </button>
                <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleUpload(doc.id, e)} />
              </div>
            </div>
          </div>
          );
        })}
        {docs.length === 0 && (
          <p className="text-sm font-bold text-slate-400 text-center py-10">Nessun documento presente. Usa "Aggiungi Documento" per iniziare.</p>
        )}
      </div>
    </div>
  );
}
