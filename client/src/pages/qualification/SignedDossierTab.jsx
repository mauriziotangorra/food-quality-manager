import React from "react";
import { Signature, UploadCloud, Download, Trash2, FileSignature, Save, FileUp } from "lucide-react";
import { useModal } from "../../hooks/useModal";
import { api } from "../../services/api";

export default function SignedDossierTab({ t, qualData, setQualData, supplierId, saveImmediate }) {
  const { showAlert, showConfirm } = useModal();

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const uploaded = await api.uploadFile(supplierId, file);
      setQualData((prev) => {
        const next = { ...prev, signedDossier: { fileName: uploaded.name, fileUrl: uploaded.url } };
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
        if (prev.signedDossier?.fileUrl) api.deleteUpload(prev.signedDossier.fileUrl).catch(() => {});
        const next = { ...prev, signedDossier: { fileName: "", fileUrl: "" } };
        saveImmediate(next);
        return next;
      });
    });
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-16">
      <div className="flex items-center gap-6 text-slate-900">
        <Signature size={48} />
        <h3 className="text-5xl font-black uppercase tracking-tighter text-slate-900">{t("tabDossierFirmato")}</h3>
      </div>
      <div className="max-w-2xl mx-auto bg-slate-50 p-16 rounded-[4rem] border-4 border-dashed border-slate-300 flex flex-col items-center justify-center gap-8 shadow-inner text-center">
        {qualData.signedDossier?.fileUrl ? (
          <div className="flex flex-col items-center animate-in zoom-in duration-300 w-full">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border-2 border-emerald-200 flex flex-col items-center gap-4 hover:border-emerald-500 transition-all w-full max-w-sm mx-auto">
              <FileSignature size={64} className="text-emerald-600" />
              <span className="font-black text-sm text-slate-900 truncate w-full px-4">{qualData.signedDossier.fileName}</span>
              <a
                href={qualData.signedDossier.fileUrl}
                download={qualData.signedDossier.fileName || "dossier_firmato.pdf"}
                className="bg-emerald-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 shadow-md transition-all flex items-center gap-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download size={16} /> {t("clickToDownload")}
              </a>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-full shadow-xl">
            <UploadCloud size={64} className="text-slate-300" />
          </div>
        )}

        {!qualData.signedDossier?.fileUrl && (
          <div>
            <h4 className="text-xl font-black uppercase mb-2 text-slate-900">{t("noSignedDossierTitle")}</h4>
            <p className="text-xs text-slate-500 font-bold px-10">{t("signedDossierHint")}</p>
          </div>
        )}

        {qualData.signedDossier?.fileUrl ? (
          <div className="flex flex-col gap-4 justify-center mt-6 w-full max-w-sm">
            <button
              onClick={async () => {
                const ok = await saveImmediate(qualData);
                if (ok) showAlert(t("alertSaved"));
              }}
              className="bg-blue-600 text-white font-black text-sm hover:bg-blue-700 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl shadow-xl transition-all uppercase w-full"
            >
              <Save size={20} /> {t("saveDossierBtn")}
            </button>
            <button
              onClick={handleDelete}
              className="text-red-700 font-black text-sm hover:bg-red-200 flex items-center justify-center gap-3 bg-red-100 px-6 py-3 rounded-2xl border border-red-300 shadow-sm transition-all uppercase"
            >
              <Trash2 size={18} /> {t("deleteFileBtn")}
            </button>
          </div>
        ) : (
          <div className="relative overflow-hidden inline-block mt-4">
            <button className="bg-slate-900 text-white px-12 py-5 rounded-3xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl pointer-events-none flex items-center gap-3">
              <FileUp size={20} /> {t("selectSignedPdf")}
            </button>
            <input type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleUpload} />
          </div>
        )}
      </div>
    </div>
  );
}
