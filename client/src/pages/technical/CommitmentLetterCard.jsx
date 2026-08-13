import React from "react";
import { FileSignature, CheckCircle2, Download, Trash2, UploadCloud, Printer } from "lucide-react";
import { useModal } from "../../hooks/useModal";
import { api } from "../../services/api";
import { generateImpegnoPDF } from "../../utils/pdfTemplates";

export default function CommitmentLetterCard({ t, lang, qualData, setQualData, supplierId, supplierName, masterLogo, saveImmediate }) {
  const { showAlert, showConfirm } = useModal();
  const impegno = qualData.impegnoSchede || {};

  const setField = (field, value) => {
    setQualData((prev) => ({ ...prev, impegnoSchede: { ...prev.impegnoSchede, [field]: value } }));
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const uploaded = await api.uploadFile(supplierId, file);
      setQualData((prev) => {
        const next = { ...prev, impegnoSchede: { ...prev.impegnoSchede, fileName: uploaded.name, fileUrl: uploaded.url } };
        saveImmediate(next);
        return next;
      });
    } catch (err) {
      showAlert(err.message || t("alertFileSize"));
    }
  };

  const handleDelete = () => {
    showConfirm(t("alertDeletePrompt"), () => {
      setQualData((prev) => {
        if (prev.impegnoSchede?.fileUrl) api.deleteUpload(prev.impegnoSchede.fileUrl).catch(() => {});
        const next = { ...prev, impegnoSchede: { ...prev.impegnoSchede, fileName: "", fileUrl: "" } };
        saveImmediate(next);
        return next;
      });
    });
  };

  return (
    <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200 p-10 mb-12">
      <div className="flex items-center gap-6 mb-8">
        <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl">
          <FileSignature size={32} />
        </div>
        <div>
          <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{t("impegnoTitle")}</h3>
          <p className="text-sm font-bold text-slate-500">{t("impegnoDesc")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200">
          <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4">1. Genera Documento</h4>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <input
              className="w-full p-3 rounded-xl border border-slate-200 shadow-sm font-bold text-sm outline-none focus:ring-2 ring-blue-500"
              placeholder={t("pdfPlaceLabel")}
              value={impegno.place || ""}
              onChange={(e) => setField("place", e.target.value)}
            />
            <input
              type="date"
              className="w-full p-3 rounded-xl border border-slate-200 shadow-sm font-bold text-sm outline-none focus:ring-2 ring-blue-500"
              value={impegno.date || ""}
              onChange={(e) => setField("date", e.target.value)}
            />
          </div>
          <button
            onClick={() => generateImpegnoPDF({ qualData, supplierName, lang, t, masterLogoUrl: masterLogo })}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-xs hover:bg-slate-700 transition-colors shadow-lg flex items-center justify-center gap-2"
          >
            <Printer size={16} /> {t("downloadImpegno")}
          </button>
        </div>

        <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 flex flex-col justify-center items-center text-center">
          <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4 w-full text-left">2. Carica Documento Firmato</h4>
          {impegno.fileUrl ? (
            <div className="w-full">
              <div className="bg-emerald-100 text-emerald-700 p-4 rounded-2xl flex items-center justify-between border border-emerald-300 mb-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <CheckCircle2 size={24} className="shrink-0" />
                  <span className="font-bold text-sm truncate">{impegno.fileName}</span>
                </div>
              </div>
              <div className="flex gap-4">
                <a href={impegno.fileUrl} download={impegno.fileName} className="flex-1 bg-white text-emerald-700 py-3 rounded-xl font-black uppercase text-xs hover:bg-emerald-50 transition-colors shadow border border-emerald-200 flex items-center justify-center gap-2">
                  <Download size={16} /> Scarica
                </a>
                <button onClick={handleDelete} className="flex-1 bg-white text-red-600 py-3 rounded-xl font-black uppercase text-xs hover:bg-red-50 transition-colors shadow border border-red-200 flex items-center justify-center gap-2">
                  <Trash2 size={16} /> Rimuovi
                </button>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden inline-block w-full">
              <button className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black uppercase text-sm hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center gap-2 pointer-events-none">
                <UploadCloud size={24} /> {t("uploadImpegno")}
              </button>
              <input type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleUpload} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
