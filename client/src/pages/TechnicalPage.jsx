import React, { useEffect, useState } from "react";
import { ArrowLeft, UploadCloud, PlusCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useLanguage } from "../hooks/useLanguage";
import { useAuth } from "../hooks/useAuth";
import { useModal } from "../hooks/useModal";
import { api } from "../services/api";
import { DEFAULT_CERTIFICAZIONI } from "../constants/defaults";
import { generateSpecPDF } from "../utils/pdfTemplates";
import { exportAllSpecsToCSV } from "../utils/csvExport";
import { pdfFirstPageToImageFile } from "../utils/pdfjsLoader";
import CommitmentLetterCard from "./technical/CommitmentLetterCard";
import HistoryModal from "./technical/HistoryModal";
import SpecEditor from "./technical/SpecEditor";

const EMPTY_QUAL_DATA = {
  anagrafica: {},
  contatti: {},
  certificazioni: DEFAULT_CERTIFICAZIONI.map((c) => ({ ...c })),
  fileA: { impegni: [], allergeniPresence: {}, allergeniGestione: {}, allergeniNotes: {} },
  fileB: {},
  fileC: [],
  signedDossier: { fileName: "", fileUrl: "" },
  impegnoSchede: { fileName: "", fileUrl: "", place: "", date: new Date().toISOString().split("T")[0] },
  pdfPlace: "",
  pdfDate: new Date().toISOString().split("T")[0],
};

function setPath(obj, path, val) {
  const parts = path.split(".");
  const copy = JSON.parse(JSON.stringify(obj));
  let target = copy;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!target[parts[i]]) target[parts[i]] = {};
    target = target[parts[i]];
  }
  target[parts[parts.length - 1]] = val;
  return copy;
}

function buildNewSpec(globalConfig, t) {
  return {
    id: Date.now().toString(),
    familyId: Date.now().toString(),
    isSaved: false,
    saveDate: null,
    isObsolete: false,
    importFlags: {},
    master: { nome: "", codice: "" },
    header: { uvcWeight: "", ean: "", approvalDate: "", revision: 0 },
    a: {
      legalName: "", brand: "", brandLogo: "", giorniGarantiti: "", claim: "", tmc: "", ingredients: "", packaging: "",
      batchFormat: "", batchDecode: "", tmcFormat: "", prepMode: "", intendedUse: "", storage: "", supplier: "", producedIn: "",
      processDesc: "", envLabel: "", packMode: "",
    },
    b: Array.from({ length: 5 }, (_, i) => ({ id: i + 1, p: "", limite: "", risultato: "", conforme: "" })),
    c: [
      { id: 1, p: t("energyKj"), v: "" }, { id: 2, p: t("energyKcal"), v: "" },
      { id: 3, p: t("fat"), v: "" }, { id: 4, p: t("satFat"), v: "" },
      { id: 5, p: t("carbs"), v: "" }, { id: 6, p: t("sugar"), v: "" },
      { id: 7, p: t("fiber"), v: "" }, { id: 8, p: t("protein"), v: "" },
      { id: 9, p: t("salt"), v: "" }, { id: 10, p: "", v: "" }, { id: 11, p: "", v: "" },
    ],
    d: Array.from({ length: 5 }, (_, i) => ({ id: i + 1, p: "", limite: "", risultato: "", conforme: "" })),
    e: { consistency: "", aroma: "", look: "", taste: "" },
    f: (globalConfig.allergeni || []).map((all) => ({ id: all.id, it: all.it, presenza: t("no"), tracce: t("no"), note: "" })),
    g: { containsGmo: t("no"), statement: "" },
    log: {
      uvc: { ean: "", pesoNetto: "", pesoSgocc: "", tara: "", pesoLordo: "", l: "", p: "", h: "" },
      box: { itf: "", pz: "", tara: "", pesoLordo: "", l: "", p: "", h: "" },
      pallet: { tipo: "", cLayer: "", layers: "", totC: "", alt: "", pesoTot: "" },
    },
    attachedSheets: [],
    photos: [],
    specDocs: {},
  };
}

export default function TechnicalPage({ onLogout }) {
  const { t, lang } = useLanguage();
  const { session } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const supplier = session?.supplier;

  const [qualData, setQualData] = useState(EMPTY_QUAL_DATA);
  const [productSpecs, setProductSpecs] = useState([]);
  const [globalConfig, setGlobalConfig] = useState({ allergeni: [], impegniA: [], impegniB: [] });
  const [masterLogo, setMasterLogo] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [expandedSpecId, setExpandedSpecId] = useState(null);
  const [showObsolete, setShowObsolete] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [historySpec, setHistorySpec] = useState(null);
  const [loading, setLoading] = useState(true);

  const isTestUser = supplier?.name?.toUpperCase() === "TEST" || supplier?.name?.toUpperCase() === "DEMO";

  useEffect(() => {
    if (!supplier) return;
    Promise.all([api.getQualifications(supplier.id), api.getSettings()])
      .then(([qData, settingsData]) => {
        if (qData.qualData) {
          setQualData((prev) => ({ ...prev, ...qData.qualData }));
        }
        if (qData.productSpecs) setProductSpecs(qData.productSpecs);
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

  const persist = async (nextQualData, nextSpecs) => {
    if (!supplier) return;
    try {
      const timestamp = new Date();
      await api.saveQualifications(supplier.id, {
        qualData: nextQualData !== undefined ? nextQualData : qualData,
        productSpecs: nextSpecs !== undefined ? nextSpecs : productSpecs,
        lastUpdate: timestamp.toISOString(),
      });
      setLastSyncTime(timestamp.toLocaleString(lang));
    } catch (e) {
      showAlert(e.message || "Errore durante il salvataggio");
    }
  };

  const saveProgress = async () => {
    await persist(qualData, productSpecs);
    showAlert(t("alertSaved"));
  };

  // --- Gestione elenco specifiche ---
  const addSpec = () => {
    const spec = buildNewSpec(globalConfig, t);
    setProductSpecs((prev) => [spec, ...prev]);
    setExpandedSpecId(spec.id);
  };

  const updateSpecField = (specId, path, val) => {
    setProductSpecs((prev) => prev.map((s) => (s.id === specId ? setPath(s, path, val) : s)));
  };

  const updateSpecTable = (specId, table, rowId, field, val) => {
    setProductSpecs((prev) =>
      prev.map((s) => (s.id !== specId ? s : { ...s, [table]: s[table].map((r) => (r.id === rowId ? { ...r, [field]: val } : r)) }))
    );
  };

  const addTableRow = (specId, table) => {
    setProductSpecs((prev) =>
      prev.map((s) => {
        if (s.id !== specId) return s;
        let newRow;
        if (table === "f") newRow = { id: Date.now(), it: "Nuovo Allergene", presenza: t("no"), tracce: t("no"), note: "" };
        else newRow = { id: Date.now(), p: "", limite: "", risultato: "", conforme: "" };
        return { ...s, [table]: [...s[table], newRow] };
      })
    );
  };

  const deleteSpec = (id) => {
    // Nel file originale la cancellazione richiedeva la password admin globale;
    // con l'autenticazione reale il fornitore è già autenticato per la propria
    // area tecnica, quindi qui si usa la stessa doppia conferma delle altre
    // cancellazioni dell'app.
    showConfirm(t("alertDeletePrompt"), () => {
      setProductSpecs((prev) => {
        const next = prev.filter((s) => s.id !== id);
        persist(qualData, next);
        return next;
      });
    });
  };

  const saveSpec = (specId) => {
    setProductSpecs((prev) => {
      const next = prev.map((s) => (s.id === specId ? { ...s, isSaved: true, saveDate: new Date().toLocaleDateString() } : s));
      persist(qualData, next);
      return next;
    });
    showAlert(t("alertSaved"));
  };

  const toggleEditSpec = (specId) => {
    setProductSpecs((prev) => prev.map((s) => (s.id === specId ? { ...s, isSaved: false } : s)));
  };

  const reviseSpec = (specId) => {
    const specToRevise = productSpecs.find((s) => s.id === specId);
    if (!specToRevise) return;
    const newRevision = JSON.parse(JSON.stringify(specToRevise));
    newRevision.id = Date.now().toString();
    if (!newRevision.familyId) newRevision.familyId = specToRevise.familyId || specToRevise.id;
    newRevision.isSaved = false;
    newRevision.isObsolete = false;
    newRevision.saveDate = null;
    newRevision.header.revision = parseInt(newRevision.header.revision || 0, 10) + 1;

    setProductSpecs((prev) => {
      const next = prev.map((s) => (s.id === specId ? { ...s, isObsolete: true, isSaved: true } : s));
      next.unshift(newRevision);
      persist(qualData, next);
      return next;
    });
    setExpandedSpecId(newRevision.id);
  };

  // --- Upload file (multipart -> server/uploads) ---
  const uploadFilesToField = async (specId, fieldName, files, importType) => {
    if (!files.length) return;
    const uploaded = [];
    for (const file of files) {
      // eslint-disable-next-line no-await-in-loop
      const res = await api.uploadFile(supplier.id, file);
      uploaded.push({ name: file.name, url: res.url });
    }
    setProductSpecs((prev) => {
      const next = prev.map((s) => {
        if (s.id !== specId) return s;
        return {
          ...s,
          [fieldName]: [...(s[fieldName] || []), ...uploaded],
          importFlags: importType ? { ...(s.importFlags || {}), [importType]: true } : s.importFlags,
        };
      });
      persist(qualData, next);
      return next;
    });
  };

  const handleMultipleFileUpload = async (specId, fieldName, event, importType) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    const hasPdfLabel = fieldName === "photos" && files.some((f) => f.type === "application/pdf");
    if (hasPdfLabel) setIsExtracting(true);

    try {
      const converted = [];
      for (const file of files) {
        if (fieldName === "photos" && file.type === "application/pdf") {
          // eslint-disable-next-line no-await-in-loop
          converted.push(await pdfFirstPageToImageFile(file));
        } else {
          converted.push(file);
        }
      }
      await uploadFilesToField(specId, fieldName, converted, importType);
    } catch (err) {
      showAlert(err.message || t("alertFileSize"));
    } finally {
      if (hasPdfLabel) setIsExtracting(false);
    }
  };

  const removeSpecFile = (specId, fieldName, idx) => {
    showConfirm(t("alertDeletePrompt"), () => {
      setProductSpecs((prev) => {
        const next = prev.map((s) => {
          if (s.id !== specId) return s;
          const removed = s[fieldName][idx];
          if (removed?.url) api.deleteUpload(removed.url).catch(() => {});
          return { ...s, [fieldName]: s[fieldName].filter((_, i) => i !== idx) };
        });
        persist(qualData, next);
        return next;
      });
    });
  };

  const handleBrandLogoUpload = async (specId, e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const uploaded = await api.uploadFile(supplier.id, file);
      setProductSpecs((prev) => {
        const next = prev.map((s) => (s.id === specId ? { ...s, a: { ...s.a, brandLogo: uploaded.url } } : s));
        persist(qualData, next);
        return next;
      });
    } catch (err) {
      showAlert(err.message || t("alertFileSize"));
    }
  };

  const handleSpecDocUpload = async (specId, docKey, e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const uploaded = await api.uploadFile(supplier.id, file);
      setProductSpecs((prev) => {
        const next = prev.map((s) => (s.id === specId ? { ...s, specDocs: { ...(s.specDocs || {}), [docKey]: { name: file.name, url: uploaded.url } } } : s));
        persist(qualData, next);
        return next;
      });
    } catch (err) {
      showAlert(err.message || t("alertFileSize"));
    }
  };

  const removeSpecDoc = (specId, docKey) => {
    showConfirm(t("alertDeletePrompt"), () => {
      setProductSpecs((prev) => {
        const next = prev.map((s) => {
          if (s.id !== specId) return s;
          const doc = s.specDocs?.[docKey];
          if (doc?.url) api.deleteUpload(doc.url).catch(() => {});
          const newDocs = { ...(s.specDocs || {}) };
          delete newDocs[docKey];
          return { ...s, specDocs: newDocs };
        });
        persist(qualData, next);
        return next;
      });
    });
  };

  const handleExportAll = () => {
    const ok = exportAllSpecsToCSV(productSpecs, lang);
    if (!ok) showAlert(t("alertNoSpecs"));
  };

  const handleExportSpecPdf = (spec, pdfType = "standard") => {
    generateSpecPDF({ spec, qualData, globalConfig, lang, t, masterLogoUrl: masterLogo, pdfType });
  };

  if (!supplier) return null;

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-20 text-slate-900">
      {isExtracting && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
          <div className="bg-white rounded-[3rem] p-12 max-w-sm w-full shadow-2xl flex flex-col items-center justify-center text-center border-4 border-blue-100">
            <Loader2 className="animate-spin text-blue-600 mb-8" size={80} strokeWidth={2} />
            <h3 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tighter">Caricamento...</h3>
            <p className="text-sm font-bold text-slate-500 leading-relaxed">Il sistema sta elaborando e convertendo il documento...</p>
          </div>
        </div>
      )}

      {historySpec && (
        <HistoryModal
          spec={historySpec}
          productSpecs={productSpecs}
          t={t}
          onClose={() => setHistorySpec(null)}
          onGeneratePdf={handleExportSpecPdf}
        />
      )}

      {isTestUser && (
        <div className="bg-amber-400 text-amber-900 font-black text-xs uppercase px-10 py-3 flex justify-between items-center sticky top-0 z-50">
          <span>Modalità Template: Modifica i testi per tutti i fornitori</span>
        </div>
      )}

      <nav className="bg-white border-b sticky top-0 z-30 px-10 py-6 flex justify-between items-center shadow-lg text-slate-900">
        <div className="flex items-center gap-6 text-slate-900">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{t("ap05_title")}</h2>
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

      <div className="max-w-7xl mx-auto p-12 space-y-12">
        <CommitmentLetterCard
          t={t}
          lang={lang}
          qualData={qualData}
          setQualData={setQualData}
          supplierId={supplier.id}
          supplierName={supplier.name}
          masterLogo={masterLogo}
          saveImmediate={(next) => persist(next, productSpecs)}
        />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900">{t("techDesc")}</h3>
          <div className="flex flex-wrap items-center gap-4">
            {productSpecs.some((s) => s.isObsolete) && (
              <button onClick={() => setShowObsolete((v) => !v)} className="bg-slate-200 text-slate-600 px-6 py-4 rounded-2xl font-black uppercase text-xs shadow-sm hover:bg-slate-300 transition-colors flex items-center gap-2">
                {showObsolete ? <EyeOff size={18} /> : <Eye size={18} />}
                {showObsolete ? t("hideObsolete") : t("showObsolete")}
              </button>
            )}
            <button onClick={addSpec} className="bg-amber-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-amber-700 flex items-center gap-2">
              <PlusCircle size={20} /> {t("newSpec")}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-slate-400 font-bold py-20">Caricamento...</div>
        ) : (
          <div className="space-y-8">
            {productSpecs
              .filter((s) => showObsolete || !s.isObsolete)
              .map((spec) => (
                <SpecEditor
                  key={spec.id}
                  spec={spec}
                  isExpanded={expandedSpecId === spec.id}
                  onToggleExpand={() => setExpandedSpecId(expandedSpecId === spec.id ? null : spec.id)}
                  t={t}
                  lang={lang}
                  globalConfig={globalConfig}
                  isTestUser={isTestUser}
                  onUpdateField={(path, val) => updateSpecField(spec.id, path, val)}
                  onUpdateTable={(table, rowId, field, val) => updateSpecTable(spec.id, table, rowId, field, val)}
                  onAddTableRow={(table) => addTableRow(spec.id, table)}
                  onDelete={() => deleteSpec(spec.id)}
                  onSave={() => saveSpec(spec.id)}
                  onToggleEdit={() => showConfirm(t("confirmEditMsg"), () => toggleEditSpec(spec.id))}
                  onRevise={() => showConfirm(t("confirmReviseMsg"), () => reviseSpec(spec.id))}
                  onShowHistory={() => setHistorySpec(spec)}
                  onExportAll={handleExportAll}
                  onExportPdf={() => handleExportSpecPdf(spec)}
                  onFilesUpload={(fieldName, e, importType) => handleMultipleFileUpload(spec.id, fieldName, e, importType)}
                  onRemoveFile={(fieldName, idx) => removeSpecFile(spec.id, fieldName, idx)}
                  onBrandLogoUpload={(e) => handleBrandLogoUpload(spec.id, e)}
                  onSpecDocUpload={(docKey, e) => handleSpecDocUpload(spec.id, docKey, e)}
                  onRemoveSpecDoc={(docKey) => removeSpecDoc(spec.id, docKey)}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
