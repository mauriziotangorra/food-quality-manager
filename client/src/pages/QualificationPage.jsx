import React, { useEffect, useState, useMemo } from "react";
import { CheckCircle2, ArrowLeft, UploadCloud, Languages } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { useAuth } from "../hooks/useAuth";
import { useModal } from "../hooks/useModal";
import { api } from "../services/api";
import { DEFAULT_CERTIFICAZIONI } from "../constants/defaults";
import TranslationShimmer from "../components/TranslationShimmer";

import AnagraficaTab from "./qualification/AnagraficaTab";
import ContattiTab from "./qualification/ContattiTab";
import CertificazioniTab from "./qualification/CertificazioniTab";
import DeclarationATab from "./qualification/DeclarationATab";
import DeclarationBTab from "./qualification/DeclarationBTab";
import DeclarationCTab from "./qualification/DeclarationCTab";
import ProductsTab from "./qualification/ProductsTab";
import DossierTab from "./qualification/DossierTab";
import SignedDossierTab from "./qualification/SignedDossierTab";
import RawMaterialsTab from "./qualification/RawMaterialsTab";
import FoodFraudDefenseTab from "./qualification/FoodFraudDefenseTab";
import MocaPackagingTab from "./qualification/MocaPackagingTab";
import HaccpTab from "./qualification/HaccpTab";

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
  fileA: { impegni: [], allergenManagementPlan: [], contaminationRiskAssessment: [], allergens: {} },
  fileB: {},
  fileC: [{ id: 1, tipologia: "Materia prima", denominazione: "", origine: "", shelfLife: "" }],
  fileD: { answers: {} },
  rawMaterials: [],
  foodFraudDefense: { foodFraud: { files: [], appliesTo: "" }, foodDefense: { files: [], appliesTo: "" } },
  mocaPackaging: { moca: [], technicalSpecs: [], migrationTests: [], ppwr: [] },
  haccp: { manualExtract: [], flowChart: [], prp: [], oprpCcp: [] },
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
  { id: "FILE_D", labelKey: "tabDichiarazioneC" },
  { id: "FILE_C", labelKey: "tabProdotti" },
  { id: "RAW_MATERIALS", labelKey: "tabMateriePrime" },
  { id: "FOOD_FRAUD_DEFENSE", labelKey: "tabFoodFraudDefense" },
  { id: "MOCA_PACKAGING", labelKey: "tabMocaPackaging" },
  { id: "HACCP", labelKey: "tabHaccp" },
  { id: "PDF", labelKey: "tabDossier" },
  { id: "SIGNED", labelKey: "tabDossierFirmato" },
];

export default function QualificationPage({ onLogout }) {
  const { t, lang, setLang } = useLanguage();
  const { session } = useAuth();
  const { showAlert } = useModal();
  const supplier = session?.supplier;

  const [activeTab, setActiveTab] = useState("ANAGRAFICA");
  const [qualData, setQualData] = useState(EMPTY_QUAL_DATA);
  const [globalConfig, setGlobalConfig] = useState({ allergeni: [], impegniA: [], impegniB: [], impegniC: [] });
  const [masterLogo, setMasterLogo] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mappa del qualData tradotto on-demand per lingua ({ en: {...}, fr: {...}, es: {...} })
  const [translatedQualMap, setTranslatedQualMap] = useState({});
  const [isTranslatingQual, setIsTranslatingQual] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const isTestUser = supplier?.name?.toUpperCase() === "TEST" || supplier?.name?.toUpperCase() === "DEMO";

  // Reset showOriginal to false when language switches
  useEffect(() => {
    setShowOriginal(false);
  }, [lang]);

  // Quando la lingua corrente non è 'it', carica qualData tradotto per la lingua selezionata
  useEffect(() => {
    if (!supplier || lang === 'it') return;
    if (translatedQualMap[lang]) return;

    let isMounted = true;
    setIsTranslatingQual(true);
    api.translateQualifications(supplier.id, {
      targetLang: lang,
      sourceLang: 'auto',
      scope: 'qual',
      qualData: qualData,
    })
      .then((res) => {
        if (isMounted && res.qualData) {
          setTranslatedQualMap((prev) => ({ ...prev, [lang]: res.qualData }));
        }
      })
      .catch((err) => console.warn('Auto-translate qualData failed:', err.message))
      .finally(() => {
        if (isMounted) setIsTranslatingQual(false);
      });

    return () => { isMounted = false; };
  }, [lang, supplier?.id, translatedQualMap, qualData]);


  // Merge live editable data with AI translation:
  // - Company Details, Contacts, Certifications are ALWAYS live from qualData
  // - Questionnaire answers keep radio selections and files, but show translated notes
  // - Products, raw materials, food fraud show translated texts
  // - Toggling showOriginal instantly returns raw qualData
  const displayQualData = useMemo(() => {
    if (showOriginal || lang === 'it' || !translatedQualMap[lang]) {
      return qualData;
    }

    const tr = translatedQualMap[lang];

    return {
      ...qualData,

      // File D: Questionnaire answers & notes (keep answer enum "Sì"/"No"/"N/A" and files intact, use translated notes)
      fileD: {
        ...qualData.fileD,
        answers: Object.fromEntries(
          Object.entries(qualData.fileD?.answers || {}).map(([qId, ans]) => {
            const trAns = tr.fileD?.answers?.[qId];
            return [
              qId,
              {
                ...ans,
                notes: (trAns?.notes !== undefined && trAns.notes !== null && trAns.notes !== '')
                  ? trAns.notes
                  : ans.notes,
              },
            ];
          })
        ),
      },

      // File C: product identity and structured values always stay original.
      fileC: qualData.fileC,

      // Raw materials: only supplier notes are translatable; names and
      // frequencies remain the original reference values.
      rawMaterials: Array.isArray(qualData.rawMaterials)
        ? qualData.rawMaterials.map((material, index) => ({
            ...material,
            notes: tr.rawMaterials?.[index]?.notes ?? material.notes,
          }))
        : qualData.rawMaterials,

      // Food Fraud & Defense
      foodFraudDefense: tr.foodFraudDefense ? {
        ...qualData.foodFraudDefense,
        foodFraud: {
          ...(qualData.foodFraudDefense?.foodFraud || {}),
          appliesTo: tr.foodFraudDefense.foodFraud?.appliesTo ?? qualData.foodFraudDefense?.foodFraud?.appliesTo,
        },
        foodDefense: {
          ...(qualData.foodFraudDefense?.foodDefense || {}),
          appliesTo: tr.foodFraudDefense.foodDefense?.appliesTo ?? qualData.foodFraudDefense?.foodDefense?.appliesTo,
        },
      } : qualData.foodFraudDefense,

      // File A: Allergens note
      fileA: tr.fileA ? {
        ...qualData.fileA,
        allergens: Object.fromEntries(
          Object.entries(qualData.fileA?.allergens || {}).map(([allId, row]) => {
            const trRow = tr.fileA?.allergens?.[allId];
            return [
              allId,
              {
                ...row,
                note: (trRow?.note !== undefined && trRow.note !== null) ? trRow.note : row.note,
              },
            ];
          })
        ),
      } : qualData.fileA,

      // Company details, contacts, certification names, places, and dates are
      // identity/reference values and always remain exactly as entered.
      anagrafica: qualData.anagrafica,
      contatti: qualData.contatti,
      certificazioni: qualData.certificazioni,
        
      // HACCP
      haccp: tr.haccp ? {
        ...qualData.haccp,
        ...Object.fromEntries(
          ['manualExtract', 'flowChart', 'prp', 'oprpCcp'].map((key) => [
            key,
            Array.isArray(qualData.haccp?.[key]) ? qualData.haccp[key].map((f, i) => (
              tr.haccp[key]?.[i]?.appliesTo !== undefined ? { ...f, appliesTo: tr.haccp[key][i].appliesTo } : f
            )) : []
          ])
        )
      } : qualData.haccp,
      
      // Places and dates are reference values, not translatable content.
      impegnoSchede: qualData.impegnoSchede,
      pdfPlace: qualData.pdfPlace,
      pdfDate: qualData.pdfDate,
    };
  }, [showOriginal, lang, translatedQualMap, qualData]);

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
            fileD: { ...prev.fileD, ...(qData.qualData.fileD || {}) },
            rawMaterials: qData.qualData.rawMaterials || prev.rawMaterials,
            foodFraudDefense: { ...prev.foodFraudDefense, ...(qData.qualData.foodFraudDefense || {}) },
            mocaPackaging: { ...prev.mocaPackaging, ...(qData.qualData.mocaPackaging || {}) },
            haccp: { ...prev.haccp, ...(qData.qualData.haccp || {}) },
          }));
        }
        if (qData.lastUpdate) setLastSyncTime(new Date(qData.lastUpdate).toLocaleString(lang));
        setMasterLogo(settingsData?.settings?.logo || '/logo.png');
        setGlobalConfig({
          allergeni: settingsData?.settings?.templates?.allergeni || [],
          impegniA: settingsData?.settings?.templates?.impegniA || [],
          impegniB: settingsData?.settings?.templates?.impegniB || [],
          impegniC: settingsData?.settings?.templates?.impegniC || [],
        });
      })
      .catch((e) => showAlert(e.message || t("genericLoadError")))
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
      showAlert(e.message || t("genericSaveError"));
    }
  };

  const handleSetQualData = (updater) => {
    setQualData((prevQual) => {
      const nextQual = typeof updater === "function" ? updater(prevQual) : updater;

      // Keep translatedQualMap in sync if user is editing in translated view so typing doesn't revert
      if (!showOriginal && lang !== 'it') {
        setTranslatedQualMap((prevMap) => {
          const currentTr = prevMap[lang];
          if (!currentTr) return {};
          const nextTr = typeof updater === "function" ? updater(currentTr) : updater;
          return { [lang]: nextTr };
        });
      } else {
        // If editing in original language, clear translations so they are re-fetched when switching
        setTranslatedQualMap({});
      }

      return nextQual;
    });
  };

  const saveQualDataPreservingSpecs = async (newData) => {
    if (!supplier) return false;
    try {
      const dataToSave = newData || qualData;
      const current = await api.getQualifications(supplier.id);
      const timestamp = new Date();
      await api.saveQualifications(supplier.id, {
        qualData: dataToSave,
        productSpecs: current.productSpecs || [],
        lastUpdate: timestamp.toISOString(),
      });
      setLastSyncTime(timestamp.toLocaleString(lang));

      // Refresh translations in background if in non-Italian language
      if (lang !== 'it') {
        api.translateQualifications(supplier.id, {
          targetLang: lang,
          sourceLang: 'auto',
          scope: 'qual',
          qualData: dataToSave,
        }).then((res) => {
          if (res.qualData) {
            setTranslatedQualMap((prev) => ({ ...prev, [lang]: res.qualData }));
          }
        }).catch((e) => console.warn('Background translation update failed:', e.message));
      }

      return true;
    } catch (e) {
      showAlert(e.message || t("genericSaveError"));
      return false;
    }
  };

  const saveProgress = async () => {
    const ok = await saveQualDataPreservingSpecs(qualData);
    if (ok) showAlert(t("alertSaved"));
  };

  const getTranslatedQualData = async (data) => {
    if (lang === 'it') return data;
    if (translatedQualMap[lang]) return translatedQualMap[lang];

    const res = await api.translateQualifications(supplier.id, {
      targetLang: lang,
      sourceLang: 'auto',
      scope: 'qual',
      qualData: data,
    });
    if (!res.qualData) throw new Error(t('translateMissingError'));
    setTranslatedQualMap((prev) => ({ ...prev, [lang]: res.qualData }));
    return res.qualData;
  };

  if (!supplier) return null;

  const tabProps = {
    t,
    lang,
    qualData: displayQualData,
    rawQualData: qualData,
    showOriginal,
    setQualData: handleSetQualData,
    globalConfig,
    setGlobalConfig,
    masterLogo,
    supplierId: supplier.id,
    supplierName: supplier.name,
    isTestUser,
    saveImmediate: saveQualDataPreservingSpecs,
    getTranslatedQualData,
    showAlert,
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 text-slate-900">
      <nav className="bg-white border-b sticky top-0 z-30 px-4 md:px-10 py-4 md:py-6 flex flex-wrap justify-between items-center gap-4 shadow-lg">
        <div className="flex items-center gap-4 md:gap-6 min-w-0">
          <CheckCircle2 size={32} className="text-emerald-600 shrink-0" />
          <h2 className="text-lg md:text-2xl font-black uppercase tracking-tighter truncate">{supplier.name}</h2>
        </div>
        <div className="flex items-center gap-3 md:gap-6 flex-wrap">
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

      <div className="max-w-7xl mx-auto p-4 md:p-12">
        {lang !== 'it' && (
          <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between text-blue-900 text-xs font-bold shadow-sm">
            <div className="flex items-center gap-2.5">
              <Languages size={18} className="text-blue-600 shrink-0" />
              <span>
                {isTranslatingQual
                  ? t('translatingContent').replace('{lang}', lang.toUpperCase())
                  : (showOriginal
                      ? t('viewingOriginalBanner')
                      : t('autoTranslatedBanner').replace('{lang}', lang.toUpperCase()))}
              </span>
            </div>
            <button
              type="button"
              id="see-original-toggle-btn"
              onClick={() => setShowOriginal((prev) => !prev)}
              disabled={isTranslatingQual && !translatedQualMap[lang]}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs transition shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ml-4"
            >
              {showOriginal ? t('viewTranslated') : t('viewOriginal')}
            </button>
          </div>
        )}

        <div className="flex bg-white/50 backdrop-blur p-2 rounded-[2.5rem] border border-slate-200 mb-6 md:mb-12 overflow-x-auto shadow-inner">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 shrink-0 py-3 md:py-5 px-4 md:px-6 rounded-[2rem] text-[10px] font-black uppercase whitespace-nowrap transition-all ${
                activeTab === tab.id ? "bg-slate-900 text-white shadow-2xl scale-[1.05]" : "text-slate-400 hover:text-slate-800"
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-[2rem] md:rounded-[4rem] shadow-2xl border border-slate-100 p-6 md:p-16 min-h-[600px]">
          {isTranslatingQual && !translatedQualMap[lang] && (
            <TranslationShimmer label={t('translatingContent').replace('{lang}', lang.toUpperCase())} />
          )}
          {loading ? (
            <div className="text-center text-slate-400 font-bold py-20">{t("loading")}</div>
          ) : (
            <>
              {activeTab === "ANAGRAFICA" && <AnagraficaTab {...tabProps} />}
              {activeTab === "CONTATTI" && <ContattiTab {...tabProps} />}
              {activeTab === "CERTIFICAZIONI" && <CertificazioniTab {...tabProps} />}
              {activeTab === "FILE_A" && <DeclarationATab {...tabProps} />}
              {activeTab === "FILE_B" && <DeclarationBTab {...tabProps} />}
              {activeTab === "FILE_D" && <DeclarationCTab {...tabProps} />}
              {activeTab === "FILE_C" && <ProductsTab {...tabProps} />}
              {activeTab === "RAW_MATERIALS" && <RawMaterialsTab {...tabProps} />}
              {activeTab === "FOOD_FRAUD_DEFENSE" && <FoodFraudDefenseTab {...tabProps} />}
              {activeTab === "MOCA_PACKAGING" && <MocaPackagingTab {...tabProps} />}
              {activeTab === "HACCP" && <HaccpTab {...tabProps} />}
              {activeTab === "PDF" && <DossierTab {...tabProps} />}
              {activeTab === "SIGNED" && <SignedDossierTab {...tabProps} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
