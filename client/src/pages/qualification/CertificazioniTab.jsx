import React from "react";
import { Award, Save, Plus, UploadCloud, Download, Trash2 } from "lucide-react";
import { useModal } from "../../hooks/useModal";
import { api } from "../../services/api";

const DEFAULT_IDS = ["ifs", "brc", "bio"];

function getCertStatus(expiryDate, t) {
  if (!expiryDate) return { label: t("certStatusMissingDate"), color: "bg-slate-100 text-slate-500 border-slate-200" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: t("certStatusExpired"), color: "bg-red-100 text-red-700 border-red-300" };
  if (diffDays <= 30) return { label: t("certStatusExpiring"), color: "bg-orange-100 text-orange-700 border-orange-300" };
  return { label: t("certStatusValid"), color: "bg-emerald-100 text-emerald-700 border-emerald-300" };
}

export default function CertificazioniTab({ t, qualData, setQualData, supplierId, saveImmediate }) {
  const { showAlert, showConfirm } = useModal();

  const updateCert = (id, field, val) => {
    setQualData((prev) => ({
      ...prev,
      certificazioni: prev.certificazioni.map((c) => (c.id === id ? { ...c, [field]: val } : c)),
    }));
  };

  const addCert = () => {
    setQualData((prev) => ({
      ...prev,
      certificazioni: [...prev.certificazioni, { id: Date.now().toString(), type: "Nuova Certificazione...", fileName: "", fileUrl: "", expiry: "" }],
    }));
  };

  const removeCert = (id) => {
    showConfirm(t("alertDeletePrompt"), () => {
      const next = { ...qualData, certificazioni: qualData.certificazioni.filter((c) => c.id !== id) };
      setQualData(next);
      saveImmediate(next);
    });
  };

  const handleUpload = async (id, e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const uploaded = await api.uploadFile(supplierId, file);
      const next = {
        ...qualData,
        certificazioni: qualData.certificazioni.map((c) => (c.id === id ? { ...c, fileName: uploaded.name, fileUrl: uploaded.url } : c)),
      };
      setQualData(next);
      const ok = await saveImmediate(next);
      if (ok) showAlert(t("alertSaved"));
    } catch (err) {
      showAlert(err.message || t("alertFileSize"));
    }
  };

  const deleteCertFile = (id) => {
    showConfirm(t("alertDeletePrompt"), () => {
      const cert = qualData.certificazioni.find((c) => c.id === id);
      if (cert?.fileUrl) api.deleteUpload(cert.fileUrl).catch(() => {});
      const next = { ...qualData, certificazioni: qualData.certificazioni.map((c) => (c.id === id ? { ...c, fileName: "", fileUrl: "" } : c)) };
      setQualData(next);
      saveImmediate(next);
    });
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
        <div className="flex items-center gap-6">
          <Award size={48} className="text-slate-900" />
          <h3 className="text-5xl font-black uppercase tracking-tighter text-slate-900">{t("tabCertificazioni")}</h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              const ok = await saveImmediate(qualData);
              if (ok) showAlert(t("alertSaved"));
            }}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Save size={16} /> {t("save")}
          </button>
          <button
            onClick={addCert}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus size={16} /> {t("addCertification")}
          </button>
        </div>
      </div>

      <div className="space-y-6 text-slate-900">
        {qualData.certificazioni.map((cert) => {
          const status = getCertStatus(cert.expiry, t);
          return (
            <div key={cert.id} className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-inner relative">
              <div className="flex-1 w-full">
                <div className="flex items-center gap-4 mb-2">
                  <input
                    className="text-2xl font-black uppercase text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none w-full md:w-auto"
                    value={cert.type}
                    onChange={(e) => updateCert(cert.id, "type", e.target.value)}
                    placeholder={t("certNamePlaceholder")}
                  />
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${status.color}`}>{status.label}</span>
                </div>
                {cert.fileUrl ? (
                  <div className="flex items-center gap-3 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 inline-flex mt-2">
                    <p className="text-xs text-blue-600 font-bold max-w-[250px] truncate" title={cert.fileName}>{cert.fileName}</p>
                    <div className="flex items-center gap-1 border-l border-blue-200 pl-3 ml-1">
                      <a href={cert.fileUrl} download={cert.fileName} className="text-blue-600 hover:text-emerald-600 bg-white p-1.5 rounded-lg shadow-sm transition-all">
                        <Download size={14} />
                      </a>
                      <button onClick={() => deleteCertFile(cert.id)} className="text-slate-400 hover:text-red-600 bg-white p-1.5 rounded-lg shadow-sm transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-bold mt-2">{t("noCertFile")}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                <div className="space-y-1 w-full md:w-auto">
                  <label className="text-[10px] font-black uppercase text-slate-500">{t("expiryLabel")}</label>
                  <input
                    type="date"
                    className="p-3 w-full rounded-xl shadow-sm border-none font-bold text-sm bg-white outline-none focus:ring-2 ring-blue-500"
                    value={cert.expiry || ""}
                    onChange={(e) => updateCert(cert.id, "expiry", e.target.value)}
                  />
                </div>
                <div className="relative overflow-hidden inline-block w-full md:w-auto mt-4 md:mt-0">
                  <button className="w-full bg-slate-900 text-white rounded-xl px-6 py-3 font-black text-xs uppercase hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center gap-2 pointer-events-none">
                    <UploadCloud size={16} /> {t("uploadPdfBtn")}
                  </button>
                  <input type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleUpload(cert.id, e)} />
                </div>
                {!DEFAULT_IDS.includes(cert.id) && (
                  <button onClick={() => removeCert(cert.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
