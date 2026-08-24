import React from "react";
import { FileSearch, Download } from "lucide-react";
import { generateQualificationDossierPDF } from "../../utils/pdfTemplates";

export default function DossierTab({ t, lang, qualData, setQualData, globalConfig, masterLogo, supplierName, saveImmediate }) {
  const handleGenerate = () => {
    generateQualificationDossierPDF({ qualData, supplierName, globalConfig, lang, t, masterLogoUrl: masterLogo });
  };

  const setField = (field, value) => {
    setQualData((prev) => {
      const next = { ...prev, [field]: value };
      return next;
    });
  };

  return (
    <div className="animate-in zoom-in duration-500 space-y-16">
      <div className="flex items-center gap-6">
        <FileSearch size={48} />
        <h3 className="text-5xl font-black uppercase tracking-tighter">{t("reportOfficialTitle")}</h3>
        <div className="h-1 flex-1 bg-slate-100 rounded-full" />
      </div>
      <div className="max-w-4xl mx-auto bg-white border-[20px] border-slate-50 p-12 shadow-2xl rounded-[3rem] overflow-hidden">
        <div className="text-center border-b-4 border-slate-900 pb-10 mb-10">
          {masterLogo && <img src={masterLogo} className="h-20 mx-auto mb-6 object-contain" alt="Logo" />}
          <h1 className="text-2xl font-black uppercase">International Food Pivot Srl</h1>
          <p className="text-[10px] font-bold opacity-60">Piazza Duca D'Aosta, 12 | 20124 Milan – Italy</p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-12 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">{t("pdfPlaceLabel")}</label>
            <input
              className="w-full p-3 rounded-xl border border-slate-200 shadow-sm font-bold text-sm outline-none focus:ring-2 ring-emerald-500"
              value={qualData.pdfPlace || ""}
              onChange={(e) => setField("pdfPlace", e.target.value)}
              placeholder={t("placeCityPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">{t("pdfDateLabel")}</label>
            <input
              type="date"
              className="w-full p-3 rounded-xl border border-slate-200 shadow-sm font-bold text-sm outline-none focus:ring-2 ring-emerald-500"
              value={qualData.pdfDate || ""}
              onChange={(e) => setField("pdfDate", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-8">
          <section className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
            <h5 className="text-[10px] font-black uppercase mb-2 text-emerald-600">{t("supplierUnderReview")}</h5>
            <p className="text-xl font-black uppercase tracking-tighter text-emerald-900">{qualData.anagrafica.rs || supplierName}</p>
          </section>
          <button
            onClick={async () => {
              await saveImmediate(qualData);
              handleGenerate();
            }}
            className="bg-slate-900 text-white px-20 py-8 rounded-[2rem] font-black text-2xl uppercase tracking-tighter hover:bg-emerald-600 transition-all shadow-2xl flex items-center gap-6 mx-auto"
          >
            <Download size={40} strokeWidth={3} /> {t("downloadOfficialPdf")}
          </button>
        </div>
      </div>
    </div>
  );
}
