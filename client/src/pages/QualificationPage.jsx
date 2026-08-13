import React, { useEffect, useState } from "react";
import { CheckCircle2, ArrowLeft, UploadCloud } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { useAuth } from "../hooks/useAuth";
import { useModal } from "../hooks/useModal";
import { api } from "../services/api";
import { DEFAULT_CERTIFICAZIONI } from "../constants/defaults";

import AnagraficaTab from "./qualification/AnagraficaTab";
import ContattiTab from "./qualification/ContattiTab";
import CertificazioniTab from "./qualification/CertificazioniTab";
import DeclarationATab from "./qualification/DeclarationATab";
import DeclarationBTab from "./qualification/DeclarationBTab";
import ProductsTab from "./qualification/ProductsTab";
import DossierTab from "./qualification/DossierTab";
import SignedDossierTab from "./qualification/SignedDossierTab";

const EMPTY_QUAL_DATA = {
  anagrafica: { rs: "", piva: "", sede: "", citta: "", provincia: "", cap: "", nazione: "" },
  contatti: {
    sales: { nome: "", email: "", tel: "" },
    marketing: { nome: "", email: "", tel: "" },
    qualita: { nome: "", email: "", tel: "" },
    amministrazione: { nome: "", email: "", tel: "" },
    customer: { nome: "", email: "", tel: "" },
    logistica: { nome: "", email: "", tel: "" },
  },
  certificazioni: DEFAULT_CERTIFICAZIONI.map((c) => ({ ...c })),
  fileA: { impegni: [], allergeniPresence: {}, allergeniGestione: {}, allergeniNotes: {} },
  fileB: {},
  fileC: [{ id: 1, tipologia: "Materia prima", denominazione: "", origine: "", shelfLife: "" }],
  signedDossier: { fileName: "", fileUrl: "" },
  impegnoSchede: { fileName: "", fileUrl: "", place: "", date: new Date().toISOString().split("T")[0] },
  pdfPlace: "",
  pdfDate: new Date().toISOString().split("T")[0],
};

const TABS = [
  { id: "ANAGRAFICA", labelKey: "tabAnagrafica" },
  { id: "CONTATTI", labelKey: "tabContatti" },
  { id: "CERTIFICAZIONI", labelKey: "tabCertificazioni" },
  { id: "FILE_A", labelKey: "tabDichiarazioneA" },
  { id: "FILE_B", labelKey: "tabDichiarazioneB" },
  { id: "FILE_C", labelKey: "tabProdotti" },
  { id: "PDF", labelKey: "tabDossier" },
  { id: "SIGNED", labelKey: "tabDossierFirmato" },
];

export default function QualificationPage({ onLogout }) {
  const { t, lang } = useLanguage();
  const { session } = useAuth();
  const { showAlert } = useModal();
  const supplier = session?.supplier;

  const [activeTab, setActiveTab] = useState("ANAGRAFICA");
  const [qualData, setQualData] = useState(EMPTY_QUAL_DATA);
  const [globalConfig, setGlobalConfig] = useState({ allergeni: [], impegniA: [], impegniB: [] });
  const [masterLogo, setMasterLogo] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [loading, setLoading] = useState(true);

  const isTestUser = supplier?.name?.toUpperCase() === "TEST" || supplier?.name?.toUpperCase() === "DEMO";

  useEffect(() => {
    if (!supplier) return;
    Promise.all([api.getQualifications(supplier.id), api.getSettings()])
      .then(([qData, settingsData]) => {
        if (qData.qualData) {
          setQualData((prev) => ({
            ...prev,
            ...qData.qualData,
            anagrafica: { ...prev.anagrafica, ...(qData.qualData.anagrafica || {}) },
            contatti: { ...prev.contatti, ...(qData.qualData.contatti || {}) },
            certificazioni: qData.qualData.certificazioni?.length ? qData.qualData.certificazioni : prev.certificazioni,
            fileA: { ...prev.fileA, ...(qData.qualData.fileA || {}) },
            fileB: { ...prev.fileB, ...(qData.qualData.fileB || {}) },
            fileC: qData.qualData.fileC?.length ? qData.qualData.fileC : prev.fileC,
          }));
        }
        if (qData.lastUpdate) setLastSyncTime(new Date(qData.lastUpdate).toLocaleString(lang));
        setMasterLogo(settingsData?.settings?.logo || null);
        setGlobalConfig({
          allergeni: settingsData?.settings?.templates?.allergeni || [],
          impegniA: settingsData?.settings?.templates?.impegniA || [],
          impegniB: settingsData?.settings?.templates?.impegniB || [],
        });
      })
      .catch((e) => showAlert(e.message || "Errore nel caricamento dei dati"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplier?.id]);

  const saveToCloud = async (newData) => {
    if (!supplier) return;
    try {
      const timestamp = new Date();
      await api.saveQualifications(supplier.id, { qualData: newData || qualData, productSpecs: undefined, lastUpdate: timestamp.toISOString() });
      setLastSyncTime(timestamp.toLocaleString(lang));
    } catch (e) {
      showAlert(e.message || "Errore durante il salvataggio");
    }
  };

  // NB: la qualifica e le specifiche tecniche condividono lo stesso record lato
  // server (PUT sovrascrive entrambi i campi): per non perdere productSpecs quando
  // si salva da quest'area, li ricarichiamo prima di scrivere.
  const saveQualDataPreservingSpecs = async (newData) => {
    if (!supplier) return;
    try {
      const current = await api.getQualifications(supplier.id);
      const timestamp = new Date();
      await api.saveQualifications(supplier.id, {
        qualData: newData,
        productSpecs: current.productSpecs || [],
        lastUpdate: timestamp.toISOString(),
      });
      setLastSyncTime(timestamp.toLocaleString(lang));
    } catch (e) {
      showAlert(e.message || "Errore durante il salvataggio");
    }
  };

  const saveProgress = async () => {
    await saveQualDataPreservingSpecs(qualData);
    showAlert(t("alertSaved"));
  };

  if (!supplier) return null;

  const tabProps = {
    t,
    lang,
    qualData,
    setQualData,
    globalConfig,
    setGlobalConfig,
    masterLogo,
    supplierId: supplier.id,
    supplierName: supplier.name,
    isTestUser,
    saveImmediate: saveQualDataPreservingSpecs,
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 text-slate-900">
      <nav className="bg-white border-b sticky top-0 z-30 px-10 py-6 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-6">
          <CheckCircle2 size={32} className="text-emerald-600" />
          <h2 className="text-2xl font-black uppercase tracking-tighter">{supplier.name}</h2>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end mr-2">
            <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              {t("connected")}
            </span>
            {lastSyncTime && <span className="text-[9px] font-bold text-slate-400 mt-0.5">{t("lastSync")} {lastSyncTime}</span>}
          </div>
          <button onClick={saveProgress} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-2">
            <UploadCloud size={16} /> {t("save")}
          </button>
          <button onClick={onLogout} className="bg-slate-100 p-4 rounded-2xl text-slate-500 hover:text-slate-900 transition-all shadow-sm">
            <ArrowLeft size={24} />
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-12">
        <div className="flex bg-white/50 backdrop-blur p-2 rounded-[2.5rem] border border-slate-200 mb-12 overflow-x-auto shadow-inner">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-5 px-6 rounded-[2rem] text-[10px] font-black uppercase whitespace-nowrap transition-all ${
                activeTab === tab.id ? "bg-slate-900 text-white shadow-2xl scale-[1.05]" : "text-slate-400 hover:text-slate-800"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-100 p-16 min-h-[600px]">
          {loading ? (
            <div className="text-center text-slate-400 font-bold py-20">Caricamento...</div>
          ) : (
            <>
              {activeTab === "ANAGRAFICA" && <AnagraficaTab {...tabProps} />}
              {activeTab === "CONTATTI" && <ContattiTab {...tabProps} />}
              {activeTab === "CERTIFICAZIONI" && <CertificazioniTab {...tabProps} />}
              {activeTab === "FILE_A" && <DeclarationATab {...tabProps} />}
              {activeTab === "FILE_B" && <DeclarationBTab {...tabProps} />}
              {activeTab === "FILE_C" && <ProductsTab {...tabProps} />}
              {activeTab === "PDF" && <DossierTab {...tabProps} />}
              {activeTab === "SIGNED" && <SignedDossierTab {...tabProps} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
