import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  ShieldCheck, Users, FileText, ChevronRight, Lock, Plus, Download, 
  CheckCircle2, ArrowLeft, Truck, Database, Printer, 
  Trash2, Info, Building2, Phone, Mail, Check, FileSearch, Award, 
  FileUp, Globe, PlusCircle, XCircle, Cloud, CloudOff, Share2, UploadCloud,
  ImageIcon, Calendar, FileDown, Signature, Scale, Package, BarChart3, 
  Thermometer, ChevronDown, ChevronUp, Edit3, Layers, Ruler, Boxes, 
  Droplets, Zap, Beaker, Apple, ShoppingBag, FlaskConical, Activity, 
  ClipboardCheck, LayoutList, Microscope, UtensilsCrossed, FlaskRound,
  AlertCircle, ShieldAlert, FileWarning, Dna, Weight, FileSpreadsheet, X, Save, FileClock, Eye, EyeOff, FileSignature, Copy, Sparkles, Loader2, History
} from 'lucide-react';

// --- CONFIGURAZIONE BACKEND (MYSQL) ---
// Il client comunica con il server Node.js/Express tramite REST API.
// Le credenziali del database sono configurate in server/.env

// --- UTILITY PER CONVERSIONE PDF -> IMMAGINE IN BROWSER ---
const loadPdfJs = async () => {
  if (window.pdfjsLib) return window.pdfjsLib;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// --- INFORMAZIONI AZIENDALI UFFICIALI ---
const companyInfoText = `International Food Pivot Srl
Sede legale ed operativa
Piazza Duca Dâ€™Aosta, 12
20124 Milano â€“ Italia
Partita IVA 11514530960
ordini@italianfoodpivot.it
amministrazione@italianfoodpivot.it
PEC internationalfoodpivot@legalmail.it
Codice SDI SUBM70N
Tel. +39 02 82197510`;

// --- COSTANTI GLOBALI E TRADUZIONI BASE ---
const ALLERGENI_DETTAGLIATI = [
  { id: 0, it: "Cereali contenenti glutine (grano, segale, orzo, avena, farro, kamut o i loro ceppi ibridati) e prodotti derivati", en: "Cereals containing gluten (wheat, rye, barley, oats, spelt, kamut or their hybridised strains) and products thereof", fr: "CÃ©rÃ©ales contenant du gluten (blÃ©, seigle, orge, avoine, Ã©peautre, kamut ou leurs souches hybridÃ©es) et produits Ã  base de ces cÃ©rÃ©ales", es: "Cereales que contengan gluten (trigo, centeno, cebada, avena, espelta, kamut o sus variedades hÃ­bridas) y productos derivados" },
  { id: 1, it: "Crostacei e prodotti a base di crostacei", en: "Crustaceans and products thereof", fr: "CrustacÃ©s et produits Ã  base de crustacÃ©s", es: "CrustÃ¡ceos y productos a base de crustÃ¡ceos" },
  { id: 2, it: "Uova e prodotti a base di uova", en: "Eggs and products thereof", fr: "Å’ufs et produits Ã  base d'Å“ufs", es: "Huevos y productos a base de huevo" },
  { id: 3, it: "Pesce e prodotti a base di pesce", en: "Fish and products thereof", fr: "Poissons et produits Ã  base de poissons", es: "Pescado y productos a base de pescado" },
  { id: 4, it: "Arachidi e prodotti a base di arachidi", en: "Peanuts and products thereof", fr: "Arachides et produits Ã  base d'arachides", es: "Cacahuetes y productos a base de cacahuetes" },
  { id: 5, it: "Soia e prodotti a base di soia", en: "Soybeans and products thereof", fr: "Soja et produits Ã  base de soja", es: "Soja y productos a base de soja" },
  { id: 6, it: "Latte e prodotti a base di latte (incluso lattosio)", en: "Milk and products thereof (including lactose)", fr: "Lait et produits Ã  base de lait (y compris le lactose)", es: "Leche y sus derivados (incluida la lactosa)" },
  { id: 7, it: "Frutta a guscio (mandorle, nocciole, noci, noci di acagiÃ¹, noci di pecan, noci del Brasile, pistacchi, noci macadamia) e prodotti derivati", en: "Nuts, namely: almonds, hazelnuts, walnuts, cashews, pecan nuts, Brazil nuts, pistachio nuts, macadamia and products thereof", fr: "Fruits Ã  coque, Ã  savoir: amandes, noisettes, noix, noix de cajou, noix de pÃ©can, noix du BrÃ©sil, pistaches, noix de Macadamia et produits Ã  base de ces fruits", es: "Frutos de cÃ¡scara, es decir: almendras, avellanas, nueces, anacardos, pacanas, nueces de Brasil, alfÃ³ncigos, nueces macadamia y productos derivados" },
  { id: 8, it: "Sedano e prodotti a base di sedano", en: "Celery and products thereof", fr: "CÃ©leri et produits Ã  base de cÃ©leri", es: "Apio y productos derivados" },
  { id: 9, it: "Senape e prodotti a base di senape", en: "Mustard and products thereof", fr: "Moutarde et produits Ã  base de moutarde", es: "Mostaza y productos derivados" },
  { id: 10, it: "Semi di sesamo e prodotti a base di semi di sesamo", en: "Sesame seeds and products thereof", fr: "Graines de sÃ©same et produits Ã  base de graines de sÃ©same", es: "Granos de sÃ©samo y productos a base de granos de sÃ©samo" },
  { id: 11, it: "Anidride solforosa e solfiti (in concentrazioni superiori a 10 mg/kg o 10 mg/litro espressi come SO2 totale)", en: "Sulphur dioxide and sulphites at concentrations of more than 10 mg/kg or 10 mg/litre in terms of the total SO2", fr: "Anhydride sulfureux et sulfites en concentrations de plus de 10 mg/kg ou 10 mg/litre en termes de SO2 total", es: "DiÃ³xido de azufre y sulfitos en concentraciones superiores a 10 mg/kg o 10 mg/litro en tÃ©rminos de SO2 total" },
  { id: 12, it: "Lupini e prodotti a base di lupini", en: "Lupin and products thereof", fr: "Lupin et produits Ã  base de lupin", es: "Altramuces y productos a base de altramuces" },
  { id: 13, it: "Molluschi e prodotti a base di molluschi", en: "Molluscs and products thereof", fr: "Mollusques et produits Ã  base de mollusques", es: "Moluscos y productos a base de moluscos" }
];

const DEFAULT_IMPEGNI_A = [
  { id: 'impA_0', it: "1) L'Azienda Fornitrice si impegna ad utilizzare esclusivamente ingredienti, additivi e coadiuvanti tecnologici esenti da OGM o da derivati di OGM, in stretta ottemperanza ai Regolamenti CE 1829/2003 e 1830/2003, impegnandosi inoltre a comunicare tempestivamente in forma scritta qualsiasi futura variazione a tale stato.", en: "1) The Supplying Company undertakes to exclusively use ingredients, additives, and processing aids free from GMOs or GMO derivatives, in strict compliance with EC Regulations 1829/2003 and 1830/2003, and also undertakes to promptly communicate in writing any future change to this status.", fr: "1) L'Entreprise Fournisseur s'engage Ã  utiliser exclusivement des ingrÃ©dients, additifs et auxiliaires technologiques exempts d'OGM ou de dÃ©rivÃ©s d'OGM, en stricte conformitÃ© avec les RÃ¨glements CE 1829/2003 e 1830/2003, s'engageant Ã©galement Ã  communiquer rapidement par Ã©crit tout changement futur de ce statut.", es: "1) La Empresa Proveedora se compromete a utilizar exclusivamente ingredientes, aditivos y coadyuvantes tecnolÃ³gicos libres de OGM o derivados de OGM, en estricto cumplimiento de los Reglamentos CE 1829/2003 y 1830/2003, comprometiÃ©ndose tambiÃ©n a comunicar rÃ¡pidamente por escrito cualquier cambio futuro en este estado." },
  { id: 'impA_1', it: "2) Lâ€™Azienda Fornitrice dichiara di aver implementato e di mantenere attive procedure e precauzioni preventive, integrate nel proprio sistema di autocontrollo e nelle procedure aziendali, finalizzate a prevenire e ridurre al minimo il rischio di commistione/contaminazione involontaria con materiali contenenti OGM durante i processi di stoccaggio, lavorazione e trasporto, in conformitÃ  ai Regolamenti (CE) 1829/2003 e 1830/2003.", en: "2) The Supplying Company declares that it has implemented and maintains active preventive procedures and precautions, integrated into its self-control system and corporate procedures, aimed at preventing and minimizing the risk of involuntary mixing/contamination with materials containing GMOs during storage, processing and transport processes, in compliance with Regulations (EC) 1829/2003 and 1830/2003.", fr: "2) L'entreprise fournisseuse dÃ©clare avoir mis en Å“uvre et maintenir des procÃ©dures et des prÃ©cautions prÃ©ventives, intÃ©grÃ©es dans son systÃ¨me d'autocontrÃ´le et ses procÃ©dures d'entreprise, visant Ã  prÃ©venir et Ã  minimiser le risque de mÃ©lange/contamination involontaire avec des matÃ©riaux contenant des OGM lors des processus de stockage, de transformation et de transport, conformÃ©ment aux rÃ¨glements (CE) 1829/2003 et 1830/2003.", es: "2) La Empresa Proveedora declara haber implementado y mantener procedimientos y precauciones preventivas, integradas en su sistema de autocontrol y procedimientos corporativos, con el objetivo de prevenir y minimizar el riesgo de mezcla/contaminaciÃ³n involuntaria con materiales que contienen OGM durante los procesos de almacenamiento, procesamiento y transporte, de acuerdo con los Reglamentos (CE) 1829/2003 y 1830/2003." },
  { id: 'impA_2', it: "3) Lâ€™Azienda Fornitrice dichiara di predisporre, aggiornare regolarmente e condividere unâ€™analisi dei pericoli igienico-sanitari (HACCP) e di applicare un sistema di qualifica e monitoraggio dei propri sub-fornitori, mediante procedure documentate e controlli periodici, al fine di assicurare la conformitÃ  e la sicurezza dei prodotti lungo la filiera a monte.", en: "3) The Supplying Company declares to prepare, regularly update and share an analysis of hygienic-sanitary hazards (HACCP) and to apply a qualification and monitoring system of its sub-suppliers, through documented procedures and periodic checks, in order to ensure the compliance and safety of products along the upstream supply chain.", fr: "3) L'entreprise fournisseuse dÃ©clare prÃ©parer, mettre Ã  jour rÃ©guliÃ¨rement et partager une analyse des risques hygiÃ©no-sanitaires (HACCP) et appliquer un systÃ¨me de qualification et de suivi de ses sous-traitants, au moyen de procÃ©dures documentÃ©es et de contrÃ´les pÃ©riodiques, afin de garantir la conformitÃ© et la sÃ©curitÃ© des produits tout au long de la chaÃ®ne d'approvisionnement en amont.", es: "3) La Empresa Proveedora declara preparar, actualizar regularmente y compartir un anÃ¡lisis de peligros higiÃ©nico-sanitarios (HACCP) y aplicar un sistema de calificaciÃ³n y monitoreo de sus subproveedores, mediante procedimientos documentados y controles periÃ³dicos, con el fin de asegurar el cumplimiento y la seguridad de los productos a lo largo de la cadena de suministro ascendente." },
  { id: 'impA_3', it: "4) L'Azienda Fornitrice dichiara di applicare rigorosamente tutte le procedure, le separazioni temporali/spaziali e i protocolli di sanificazione validati previsti dal proprio piano HACCP per scongiurare il rischio di cross-contaminazione accidentale da ALLERGENI (Reg. UE 1169/2011) tutelando il consumatore finale.", en: "4) The Supplying Company declares to strictly apply all the procedures, temporal/spatial separations, and validated sanitization protocols foreseen by its HACCP plan to prevent the risk of accidental cross-contamination by ALLERGENS (EU Reg. 1169/2011) protecting the final consumer.", fr: "4) L'Entreprise Fournisseur dÃ©clare appliquer rigoureusement toutes les procÃ©dures, sÃ©parations temporelles/spatiales et protocoles de nettoyage validÃ©s prÃ©vus par son plan HACCP pour prÃ©venir le risque de contamination croisÃ©e accidentelle par des ALLERGÃˆNES (RÃ¨g. UE 1169/2011) protÃ©geant le consommateur final.", es: "4) La Empresa Proveedora declara aplicar rigurosamente todos los procedimientos, separaciones temporales/espaciales y protocolos de limpieza validados previstos por su plan APPCC para prevenir el riesgo de contaminaciÃ³n cruzada accidental por ALÃ‰RGENOS (Reg. UE 1169/2011) protegiendo al consumidor final." }
];

const DEFAULT_IMPEGNI_B = [
  { id: 'validazioneProd', title_it: "Validazione dei Processi Produttivi", desc_it: "L'Azienda Fornitrice garantisce formalmente che tutti i processi di produzione, confezionamento, stoccaggio e manipolazione sono regolarmente validati, costantemente monitorati e documentati secondo le normative igienico-sanitarie vigenti (Pacchetto Igiene) e nel rispetto dei parametri definiti dai severi standard di certificazione volontaria adottati.", title_en: "Validation of Production Processes", desc_en: "The Supplying Company formally guarantees that all production, packaging, storage, and handling processes are regularly validated, constantly monitored, and documented according to the hygiene and sanitary regulations in force (Hygiene Package) and in compliance with the parameters defined by the strict voluntary certification standards adopted.", title_fr: "Validation des Processus de Production", desc_fr: "L'Entreprise Fournisseur garantit formellement que tous processus de production, conditionnement, stockage et manipulation sont rÃ©guliÃ¨rement validÃ©s, constamment surveillÃ©s et documentÃ©s conformÃ©ment Ã  la rÃ©glementation en matiÃ¨re d'hygiÃ¨ne en vigueur (Paquet HygiÃ¨ne) et dans le respect des paramÃ¨tres dÃ©finis par les normes de certification volontaires strictes adoptÃ©es.", title_es: "ValidaciÃ³n de los Procesos de ProducciÃ³n", desc_es: "La Empresa Proveedora garantiza formalmente que todos los procesos de producciÃ³n, envasado, almacenamiento y manipulaciÃ³n se validan regularmente, se supervisan constantemente y se documentan de acuerdo con las normativas higiÃ©nico-sanitarias vigentes (Paquete de Higiene) y en cumplimiento de los parÃ¡metros definidos por los estrictos estÃ¡ndares de certificaciÃ³n voluntaria adoptados." },
  { id: 'validazioneTras', title_it: "Sicurezza, Igiene e Trasporti a Temperatura Controllata", desc_it: "L'Azienda Fornitrice garantisce che i mezzi di trasporto utilizzati per le consegne in entrata e in uscita rispettano i piÃ¹ rigidi requisiti igienico-sanitari (HACCP). Viene garantito senza interruzioni il mantenimento della catena del freddo o delle temperature specifiche richieste per la conservazione ottimale del prodotto. I veicoli sono inoltre assoggettati a regolari e documentati piani di pulizia e sanificazione.", title_en: "Safety, Hygiene, and Temperature-Controlled Transport", desc_en: "The Supplying Company guarantees that the means of transport used for incoming and outgoing deliveries meet the strictest hygiene and sanitary requirements (HACCP). The maintenance of the cold chain or specific temperatures required for optimal product conservation is guaranteed without interruption. Vehicles are also subjected to regular and documented cleaning and sanitization plans.", title_fr: "SÃ©curitÃ©, HygiÃ¨ne et Transport sous TempÃ©rature ContrÃ´lÃ©e", desc_fr: "L'Entreprise Fournisseur garantit que les moyens de transport utilisÃ©s pour les livraisons entrantes et sortantes respectent les exigences hygiÃ©no-sanitaires les plus strictes (HACCP). Le maintien de la chaÃ®ne du froid ou des tempÃ©ratures spÃ©cifiques requises pour une conservation optimale du produit est garanti sans interruption. Les vÃ©hicules sont Ã©galement soumis Ã  des plans de nettoyage et d'assainissement rÃ©guliers et documentÃ©s.", title_es: "Seguridad, Higiene y Transporte a Temperatura Controlada", desc_es: "La Empresa Proveedora garantiza que los medios de transporte utilizados para las entregas entrantes y salientes cumplen con los requisitos higiÃ©nico-sanitarios mÃ¡s estrictos (APPCC). Se garantiza sin interrupciÃ³n el mantenimiento de la cadena de frÃ­o o de las temperaturas especÃ­ficas requeridas para la conservaciÃ³n Ã³ptima del producto. Los vehÃ­culos tambiÃ©n estÃ¡n sujetos a planes de limpieza y desinfecciÃ³n regulares y documentados." },
  { id: 'rintracciabilita', title_it: "RintracciabilitÃ  Integrale (Reg. CE 178/2002)", desc_it: "L'Azienda Fornitrice garantisce l'implementazione e l'efficacia di un sistema strutturato di rintracciabilitÃ  (in conformitÃ  al Regolamento CE 178/2002), in grado di identificare biunivocamente e in qualsiasi momento il lotto specifico di materia prima, del materiale di imballaggio primario e del prodotto finito. Si garantisce l'esecuzione di simulazioni di ritiro/richiamo dal mercato con cadenza almeno annuale.", title_en: "Full Traceability (EC Reg. 178/2002)", desc_en: "The Supplying Company guarantees the implementation and effectiveness of a structured traceability system (in compliance with EC Reg. 178/2002), capable of uniquely identifying at any time the specific batch of raw material, primary packaging material, and finished product. The execution of market withdrawal/recall simulations is guaranteed at least annually.", title_fr: "TraÃ§abilitÃ© IntÃ©grale (RÃ¨g. CE 178/2002)", desc_fr: "L'Entreprise Fournisseur garantit la mise en Å“uvre et l'efficacitÃ© d'un systÃ¨me de traÃ§abilitÃ© structurÃ© (conformÃ©ment au RÃ¨glement CE 178/2002), capable d'identifier de maniÃ¨re univoque et Ã  tout moment le lot spÃ©cifique de matiÃ¨re premiÃ¨re, de matÃ©riau d'emballage primaire et de produit fini. L'exÃ©cution de simulations de retrait/rappel du marchÃ© est garantie au moins annuellement.", title_es: "Trazabilidad Integral (Reg. CE 178/2002)", desc_es: "La Empresa Proveedora garantiza la implementaciÃ³n y eficacia de un sistema de trazabilidad estructurado (de conformidad con el Reg. CE 178/2002), capaz de identificar de forma inequÃ­voca y en cualquier momento el lote especÃ­fico de materia prima, material de embalaje primario y producto terminado. Se garantiza la ejecuciÃ³n de simulacros de retirada/recuperaciÃ³n del mercado al menos anualmente." }
];

const translations = {
  it: {
    title: "Food Quality Manager", subtitle: "International Food Pivot Srl - Portale QualitÃ ",
    admin: "Amministratore", adminDesc: "Gestione profili fornitori.",
    qualify: "Area Qualifica", qualifyDesc: "Iter di qualifica tecnica e sanitaria.",
    tech: "Area Tecnica", techDesc: "Infinite specifiche prodotto AP 07.2.1.",
    access: "Entra", back: "Home", save: "Sincronizza Cloud", download: "Scarica PDF",
    tabAnagrafica: "1 ANAGRAFICA", tabContatti: "2 CONTATTI", tabCertificazioni: "3 CERTIFICAZIONI", 
    tabDichiarazioneA: "4 DICHIARAZIONE A", tabDichiarazioneB: "5 DICHIARAZIONE B", tabProdotti: "6 PRODOTTI", 
    tabDossier: "7 DOSSIER", tabDossierFirmato: "8 DOSSIER FIRMATO",
    loginTitle: "Accesso Fornitore", passwordPlaceholder: "PASSWORD",
    ap05_title: "AP 07.2.1 SPECIFICA TECNICA PRODOTTO",
    newSpec: "Nuova Specifica", saveSpec: "Salva Specifica", editSpec: "Modifica", reviseSpec: "Revisiona",
    exportAll: "Esporta Tutto in Excel", exportPdf: "Esporta in PDF", exportPdfIfp: "Esporta in PDF IFP",
    importTech: "Importa Scheda Tecnica", importLog: "Importa Scheda Logistica", importMicro: "Dati Microbiologici", importChem: "Dati Chimici", importLabel: "Importa Etichetta", importPhoto: "Foto Prodotto",
    titleImportTech: "Carica Documento Scheda Tecnica", titleImportLog: "Carica Scheda Logistica", titleImportMicro: "Carica Analisi Microbiologiche", titleImportChem: "Carica Dati Chimici", titleImportLabel: "Carica Etichetta (JPG/PNG/PDF)", titleImportPhoto: "Carica Foto Prodotto",
    attachedFiles: "File Allegati alla Scheda:",
    statusArchived: "Archiviata", statusRead: "In Lettura", statusEdit: "In Modifica",
    supplier: "Fornitore", producedIn: "Prodotto in", packaging: "Materiale Imballo", batchFormat: "Formato Lotto", batchDecode: "Decodifica Lotto", prepMode: "ModalitÃ  di etichettatura", intendedUse: "ModalitÃ  d'uso e consumo", storage: "Condizioni conservazione",
    processDesc: "Descrizione del processo", envLabel: "Etichetta ambientale (codice identificativo materiale e Raccolta)", packMode: "ModalitÃ  di confezionamento (sottovuoto, atmosfera protettiva, ecc)",
    specDocsTitle: "Documentazione Obbligatoria Allegata", moca: "Dichiarazione MOCA", haccp: "Piano HACCP", packSheet: "Scheda tecnica mat. di confezionamento", bio: "Certificazione BIO", shelfLife: "Validazione shelf life",
    sc_b: "b) CARATTERISTICHE MICROBIOLOGICHE", param: "Parametro", limite: "Limite richiesto", risultato: "Risultato", conforme: "Conforme (si/no)", um: "UM", target: "Target",
    sc_c: "c) DICHIARAZIONE NUTRIZIONALE (Valori x 100g)", element: "Elemento", value: "Valore",
    energyKj: "Energia (kJ)", energyKcal: "Energia (kcal)", fat: "Grassi (g)", satFat: "di cui acidi grassi saturi (g)", carbs: "Carboidrati (g)", sugar: "di cui zuccheri (g)", fiber: "Fibre (g)", protein: "Proteine (g)", salt: "Sale (g)",
    sc_d: "d) CARATTERISTICHE CHIMICHE",
    sc_e: "e) CARATTERISTICHE ORGANOLETTICHE", consistency: "Consistenza", aroma: "Aroma", look: "Apparenza/Colore", taste: "Sapore",
    sc_f: "f) DICHIARAZIONE ALLERGENI", allergen: "Allergene", presence: "Presenza", traces: "Traces / Cross-Cont.", yes: "SÃ¬", no: "No", notes: "Note",
    sc_g: "g) DICHIARAZIONE OGM", containsGmo: "Contiene OGM?", requiresLabeling: "Etichettatura?", notesGmo: "Note OGM...",
    sc_h: "h) INFORMAZIONI LOGISTICHE", logParam: "Parametro", logUvc: "UnitÃ  di Vendita", logCarton: "Cartone", logPallet: "Pallet",
    eanItfType: "Codice EAN / ITF / Tipo", dims: "Dimensioni (L x P x H) cm", netDrain: "Peso Netto / Sgocc. (g)", tareGross: "Tara / Peso Lordo", composition: "Composizione / Pz", l: "L", p: "P", h: "A", net: "Netto", drain: "Sgocc.", tare: "Tara", gross: "Lordo", pzCarton: "Pz x Cart", cLayer: "Cartoni x Strato", layers: "Strati x Pallet", totCarton: "Tot Crt", hTot: "Altezza Totale Pallet (cm)", wTot: "Peso Totale Pallet (kg)",
    alertDelete: "Inserisci la password di amministrazione per eliminare questa scheda:", alertWrongPwd: "Password errata. Operazione annullata.", alertFileSize: "Attenzione il file supera il limite massimo per favore comprimi", alertNoSpecs: "Nessuna scheda attiva presente nel catalogo per l'esportazione.", alertSaved: "Dati sincronizzati nel Cloud!",
    alertDeletePrompt: "Sei sicuro di voler cancellare questo dato?", unlockPrompt: "Inserisci la password di sicurezza per sbloccare il campo:",
    compressImages: "Comprimi Immagini", compressPdf: "Comprimi PDF",
    tooltipEdit: "Modifica i dati correnti senza cambiare la revisione.",
    confirmEditMsg: "MODIFICA VERSIONE CORRENTE\n\nQuesta azione ti permette di sbloccare e correggere i dati della scheda attuale senza alterare il numero di revisione.\n\nVuoi procedere?",
    tooltipRevise: "Archivia questa versione e crea una nuova revisione.",
    confirmReviseMsg: "CREA NUOVA REVISIONE\n\nLa versione attuale verrÃ  bloccata e salvata nell'archivio storico.\n\nVerrÃ  creata una nuova scheda con un numero di revisione successivo.\n\nVuoi procedere?",
    historyBtn: "Cronologia",
    historyTitle: "Cronologia",
    showObsolete: "Mostra Revisioni", hideObsolete: "Nascondi Revisioni",
    connected: "Connesso al Cloud", lastSync: "Ultima Sincronizzazione:",
    pdfReportTitle: "DOSSIER UFFICIALE DI QUALIFICA FORNITORE",
    sect1: "1. Anagrafica Aziendale", rs: "Ragione Sociale", piva: "Partita IVA / Tax ID", nazione: "Nazione", sede: "Sede Operativa", citta: "CittÃ ", provincia: "Provincia", cap: "CAP",
    sect2: "2. Referenti Operativi (Contatti)", dept: "Reparto", name: "Nome e Cognome", email: "Email", tel: "Telefono",
    sect3: "3. Certificazioni di Sistema (QualitÃ  e Sicurezza)", certType: "Standard / Tipologia", expDate: "Data di Scadenza", attState: "Stato Allegato", loaded: "Documento Caricato", missing: "Mancante", notDef: "Non definita",
    sect4: "4. Dichiarazioni di ConformitÃ  (OGM, HACCP, Allergeni)", decl: "Dichiarazione", outcome: "Esito",
    sect5: "5. Gestione Processi e Flussi Logistici", ctrlParam: "Parametro di Controllo",
    sect6: "6. Griglia Allergeni (Dichiarazione di Stabilimento)", presImp: "Presenza Impianto", gestPrev: "Gestione / Note Preventive",
    sect7: "7. Elenco Prodotti Qualificati", typology: "Tipologia",
    placeAndDate: "Luogo e Data", suppStamp: "Timbro e Firma Fornitore", suppRole: "(Legale Rappresentante o Responsabile QualitÃ )", pivotStamp: "Timbro e Firma International Food Pivot", pivotRole: "(Dipartimento QualitÃ  - Per presa visione e approvazione)",
    yesAccept: "ACCETTATO (SÃŒ)", noAccept: "NON ACCETTATO (NO)", yesConf: "CONFERMATO (SÃŒ)", noConf: "NON CONFERMATO (NO)",
    pdfPlaceLabel: "Luogo della Firma", pdfDateLabel: "Data della Firma",
    impegnoTitle: "Lettera Impegno Schede Tecniche",
    impegnoDesc: "Genera, fai firmare e ricarica il documento di impegno per l'aggiornamento continuo delle schede tecniche.",
    downloadImpegno: "Genera PDF Impegno", uploadImpegno: "Carica PDF Firmato",
    impObj: "Oggetto: Impegno di aggiornamento e validitÃ  delle schede tecniche",
    impSubj: "Il/La sottoscritto/a, in qualitÃ  di legale rappresentante o soggetto autorizzato per conto della societÃ :",
    impDeclTitle: "DICHIARA E S'IMPEGNA A:",
    impPoint1: "1. Comunicare tempestivamente a International Food Pivot Srl qualsiasi modifica, variazione o aggiornamento relativo alle schede tecniche dei prodotti/servizi forniti.",
    impPoint2: "2. Procedere alla revisione delle suddette schede tecniche in ogni occasione in cui se ne renda la necessitÃ , per garantire che i dati in possesso di International Food Pivot Srl siano sempre corretti e attuali.",
    impCondTitle: "CONDIZIONI DI VALIDITÃ€:",
    impCondText1: "Resta espressamente inteso che, qualora non venga effettuata e comunicata alcuna revisione o aggiornamento da parte di",
    impCondText2: ", International Food Pivot Srl considererÃ  come valide, corrette e definitive le informazioni contenute nelle schede tecniche fornite fino a quel momento. International Food Pivot Srl Ã¨ pertanto sollevata da qualsiasi responsabilitÃ  derivante dall'uso di dati non aggiornati per mancata comunicazione.",
    impSignClient: "Firma del Legale Rappresentante o Responsabile QualitÃ :"
  },
  en: {
    title: "Food Quality Manager", subtitle: "International Food Pivot Srl - Quality Portal",
    admin: "Administrator", adminDesc: "Supplier profile management.",
    qualify: "Qualification Area", qualifyDesc: "Technical and sanitary qualification process.",
    tech: "Technical Area", techDesc: "Unlimited AP 07.2.1 product specifications.",
    access: "Enter", back: "Home", save: "Sync Cloud", download: "Download PDF",
    tabAnagrafica: "1 COMPANY DETAILS", tabContatti: "2 CONTACTS", tabCertificazioni: "3 CERTIFICATIONS", 
    tabDichiarazioneA: "4 DECLARATION A", tabDichiarazioneB: "5 DECLARATION B", tabProdotti: "6 PRODUCTS", 
    tabDossier: "7 DOSSIER", tabDossierFirmato: "8 SIGNED DOSSIER",
    loginTitle: "Supplier Access", passwordPlaceholder: "PASSWORD",
    ap05_title: "AP 07.2.1 PRODUCT SPECIFICATION",
    newSpec: "New Specification", saveSpec: "Save Specification", editSpec: "Edit", reviseSpec: "Revise",
    exportAll: "Export All to Excel", exportPdf: "Export to PDF", exportPdfIfp: "Export to PDF IFP",
    importTech: "Import Technical Sheet", importLog: "Import Logistics Sheet", importMicro: "Microbiological Data", importChem: "Chemical Data", importLabel: "Import Label", importPhoto: "Product Photo",
    titleImportTech: "Upload Technical Sheet Document", titleImportLog: "Upload Logistics Sheet", titleImportMicro: "Upload Microbiological Analysis", titleImportChem: "Upload Chemical Data", titleImportLabel: "Upload Label (JPG/PNG/PDF)", titleImportPhoto: "Upload Product Photo",
    attachedFiles: "Files Attached to Specification:",
    statusArchived: "Archived", statusRead: "Read Only", statusEdit: "Editing",
    supplier: "Supplier", producedIn: "Produced in", packaging: "Packaging Material", batchFormat: "Batch Format", batchDecode: "Batch Decode", prepMode: "Labeling mode", intendedUse: "Mode of use and consumption", storage: "Storage Conditions",
    processDesc: "Process description", envLabel: "Environmental label (material ID code and recycling)", packMode: "Packaging mode (vacuum, modified atmosphere, etc.)",
    specDocsTitle: "Attached Mandatory Documentation", moca: "MOCA Declaration", haccp: "HACCP Plan", packSheet: "Packaging Material Technical Sheet", bio: "BIO Certification", shelfLife: "Shelf Life Validation",
    sc_b: "b) MICROBIOLOGICAL CHARACTERISTICS", param: "Parameter", limite: "Required Limit", risultato: "Result", conforme: "Compliant (yes/no)", um: "UM", target: "Target",
    sc_c: "c) NUTRITIONAL DECLARATION (per 100g)", element: "Element", value: "Value",
    energyKj: "Energy (kJ)", energyKcal: "Energy (kcal)", fat: "Fat (g)", satFat: "of which saturates (g)", carbs: "Carbohydrate (g)", sugar: "of which sugars (g)", fiber: "Fiber (g)", protein: "Protein (g)", salt: "Salt (g)",
    sc_d: "d) CHEMICAL CHARACTERISTICS",
    sc_e: "e) ORGANOLEPTIC CHARACTERISTICS", consistency: "Consistency", aroma: "Aroma", look: "Appearance/Color", taste: "Taste",
    sc_f: "f) ALLERGEN DECLARATION", allergen: "Allergen", presence: "Presence (Ingredient)", traces: "Traces Risk (Cross-Cont.)", yes: "Yes", no: "No", notes: "Notes",
    sc_g: "g) GMO DECLARATION", containsGmo: "Contains GMO?", requiresLabeling: "Requires Labeling?", notesGmo: "GMO Notes...",
    sc_h: "h) LOGISTICS INFORMATION", logParam: "Parameter", logUvc: "Sales Unit", logCarton: "Carton", logPallet: "Pallet",
    eanItfType: "EAN / ITF / Type Code", dims: "Dimensions (L x W x H) cm", netDrain: "Net / Drained Weight (g)", tareGross: "Tare / Gross Weight", composition: "Composition / Pcs", l: "L", p: "W", h: "H", net: "Net", drain: "Drained", tare: "Tare", gross: "Gross", pzCarton: "Pcs x Carton", cLayer: "Cartons x Layer", layers: "Layers x Pallet", totCarton: "Tot Cartons", hTot: "Total Pallet Height (cm)", wTot: "Total Pallet Weight (kg)",
    alertDelete: "Enter admin password to delete this specification:", alertWrongPwd: "Wrong password. Operation cancelled.", alertFileSize: "Attention, the file exceeds the maximum limit, please compress it", alertNoSpecs: "No active specification found in catalog for export.", alertSaved: "Data synchronized to Cloud!",
    alertDeletePrompt: "Are you sure you want to delete this data?", unlockPrompt: "Enter security password to unlock the field:",
    compressImages: "Compress Images", compressPdf: "Compress PDF",
    tooltipEdit: "Edit current data without changing the revision.",
    confirmEditMsg: "EDIT CURRENT VERSION\n\nThis action allows you to unlock and correct the data of the current sheet without altering the revision number.\n\nDo you want to proceed?",
    tooltipRevise: "Archive this version and create a new revision.",
    confirmReviseMsg: "CREATE NEW REVISION\n\nThe current version will be locked and saved in the historical archive.\n\nA new updated sheet will be created with a subsequent revision number.\n\nDo you want to proceed?",
    historyBtn: "History",
    historyTitle: "History",
    showObsolete: "Show Revisions", hideObsolete: "Hide Revisions",
    connected: "Connected to Cloud", lastSync: "Last Synchronization:",
    pdfReportTitle: "OFFICIAL SUPPLIER QUALIFICATION DOSSIER",
    sect1: "1. Company Details", rs: "Company Name", piva: "VAT Number / Tax ID", nazione: "Country", sede: "Operating Headquarters", citta: "City", provincia: "Province/State", cap: "ZIP Code",
    sect2: "2. Operational Contacts", dept: "Department", name: "Full Name", email: "Email", tel: "Phone",
    sect3: "3. System Certifications (Quality and Safety)", certType: "Standard / Type", expDate: "Expiration Date", attState: "Attachment Status", loaded: "Document Uploaded", missing: "Missing", notDef: "Not defined",
    sect4: "4. Declarations of Conformity (GMO, HACCP, Allergens)", decl: "Declaration", outcome: "Outcome",
    sect5: "5. Process and Logistics Management", ctrlParam: "Control Parameter",
    sect6: "6. Allergen Grid (Facility Declaration)", presImp: "Presence in Facility", gestPrev: "Management / Preventive Notes",
    sect7: "7. List of Qualified Products", typology: "Typology",
    placeAndDate: "Place and Date", suppStamp: "Supplier Stamp and Signature", suppRole: "(Legal Representative or Quality Manager)", pivotStamp: "International Food Pivot Stamp and Signature", pivotRole: "(Quality Department - For acknowledgement and approval)",
    yesAccept: "ACCEPTED (YES)", noAccept: "NOT ACCEPTED (NO)", yesConf: "CONFIRMED (YES)", noConf: "NOT CONFIRMED (NO)",
    pdfPlaceLabel: "Place of Signature", pdfDateLabel: "Date of Signature",
    impegnoTitle: "Technical Sheets Commitment Letter",
    impegnoDesc: "Generate, sign, and upload the commitment document for continuous updating of technical sheets.",
    downloadImpegno: "Generate Commitment PDF",
    uploadImpegno: "Upload Signed PDF",
    impObj: "Subject: Commitment to update and validity of technical sheets",
    impSubj: "The undersigned, as legal representative or authorized person on behalf of the company:",
    impDeclTitle: "DECLARES AND COMMITS TO:",
    impPoint1: "1. Promptly communicate to International Food Pivot Srl any change, variation or update related to the technical sheets of the products/services provided.",
    impPoint2: "2. Proceed with the revision of the aforementioned technical sheets whenever necessary, to ensure that the data held by International Food Pivot Srl is always correct and current.",
    impCondTitle: "CONDITIONS OF VALIDITY:",
    impCondText1: "It is expressly understood that, if no revision or update is carried out and communicated by",
    impCondText2: ", International Food Pivot Srl will consider the information contained in the technical sheets provided up to that moment as valid, correct and definitive. International Food Pivot Srl is therefore relieved of any liability arising from the use of outdated data due to lack of communication.",
    impSignClient: "Signature of Legal Representative or Quality Manager:"
  },
  fr: {
    title: "Food Quality Manager", subtitle: "International Food Pivot Srl - Portail QualitÃ©",
    admin: "Administrateur", adminDesc: "Gestion des fournisseurs.",
    qualify: "Espace Qualification", qualifyDesc: "Processus de qualification technique.",
    tech: "Espace Technique", techDesc: "SpÃ©cifications AP 07.2.1 illimitÃ©es.",
    access: "Entrer", back: "Accueil", save: "Sauvegarder", download: "TÃ©lÃ©charger PDF",
    tabAnagrafica: "1 ANAGRAFICA", tabContatti: "2 CONTACTS", tabCertificazioni: "3 CERTIFICATIONS", 
    tabDichiarazioneA: "4 DÃ‰CLARATION A", tabDichiarazioneB: "5 DÃ‰CLARATION B", tabProdotti: "6 PRODUITS", 
    tabDossier: "7 DOSSIER", tabDossierFirmato: "8 DOSSIER SIGNÃ‰",
    loginTitle: "AccÃ¨s Fournisseur", passwordPlaceholder: "MOT DE PASSE",
    ap05_title: "AP 07.2.1 SPÃ‰CIFICATION DU PRODUIT",
    newSpec: "Nouvelle SpÃ©cification", saveSpec: "Sauvegarder", editSpec: "Modifier", reviseSpec: "RÃ©viser",
    exportAll: "Tout exporter (Excel)", exportPdf: "Exporter en PDF", exportPdfIfp: "Exporter en PDF IFP",
    importTech: "Importer Fiche Technique", importLog: "Importer Fiche Log.", importMicro: "DonnÃ©es Microbiologiques", importChem: "DonnÃ©es Chimiques", importLabel: "Importer Ã‰tiquette", importPhoto: "Photo Produit",
    titleImportTech: "Charger Document Fiche Technique", titleImportLog: "Charger Fiche Logistique", titleImportMicro: "Charger Analyses Microbiologiques", titleImportChem: "Charger DonnÃ©es Chimiques", titleImportLabel: "Charger Ã‰tiquette (JPG/PNG/PDF)", titleImportPhoto: "Charger Photo Produit",
    attachedFiles: "Fichiers joints :",
    statusArchived: "ArchivÃ©", statusRead: "Lecture Seule", statusEdit: "En Ã‰dition",
    supplier: "Fournisseur", producedIn: "Produit en", packaging: "MatÃ©riau d'emballage", batchFormat: "Format de lot", batchDecode: "DÃ©codage de lot", prepMode: "Mode d'Ã©tiquetage", intendedUse: "Mode d'utilisation et de consommation", storage: "Conditions de conservation",
    processDesc: "Description du processus", envLabel: "Ã‰tiquette environnementale (code d'identification de matÃ©riau et recyclage)", packMode: "Mode de conditionnement (sous vide, atmosphÃ¨re protectrice, etc.)",
    specDocsTitle: "Documentation Obligatoire Jointe", moca: "DÃ©claration MOCA", haccp: "Plan HACCP", packSheet: "Fiche technique matÃ©riel d'emballage", bio: "Certification BIO", shelfLife: "Validation shelf life",
    sc_b: "b) CARACTÃ‰RISTIQUES MICROBIOLOGIQUES", param: "ParamÃ¨tre", limite: "Limite requise", risultato: "RÃ©sultat", conforme: "Conforme (oui/non)", um: "UM", target: "Cible",
    sc_c: "c) DÃ‰CLARATION NUTRITIONNELLE (pour 100g)", element: "Ã‰lÃ©ment", value: "Valeur",
    energyKj: "Ã‰nergie (kJ)", energyKcal: "Ã‰nergie (kcal)", fat: "MatiÃ¨res grasses (g)", satFat: "dont acides gras saturÃ©s (g)", carbs: "Glucides (g)", sugar: "dont sucres (g)", fiber: "Fibres (g)", protein: "ProtÃ©ines (g)", salt: "Sel (g)",
    sc_d: "d) CARACTÃ‰RISTIQUES CHIMIQUES",
    sc_e: "e) CARACTÃ‰RISTIQUES ORGANOLEPTIQUES", consistency: "Consistance", aroma: "ArÃ´me", look: "Apparence/Couleur", taste: "GoÃ»t",
    sc_f: "f) DÃ‰CLARATION DES ALLERGÃˆNES", allergen: "AllergÃ¨ne", presence: "PrÃ©sence", traces: "Traces", yes: "Oui", no: "Non", notes: "Notes",
    sc_g: "g) DÃ‰CLARATION OGM", containsGmo: "Contient des OGM ?", requiresLabeling: "Ã‰tiquetage requis ?", notesGmo: "Notes OGM...",
    sc_h: "h) INFORMATIONS LOGISTIQUES", logParam: "ParamÃ¨tre", logUvc: "UnitÃ© de vente", logCarton: "Carton", logPallet: "Palette",
    eanItfType: "Code EAN / ITF / Type", dims: "Dimensions (L x P x H) cm", netDrain: "Poids Net / Ã‰gouttÃ© (g)", tareGross: "Tare / Poids Brut", composition: "Composition / Pcs", l: "L", p: "P", h: "H", net: "Net", drain: "Ã‰gouttÃ©", tare: "Tare", gross: "Brut", pzCarton: "Pcs x Carton", cLayer: "Cartons x Couche", layers: "Couches x Palette", totCarton: "Tot Cartons", hTot: "Hauteur Totale Palette (cm)", wTot: "Poids Total Palette (kg)",
    alertDelete: "Entrez le mot de passe administrateur pour supprimer :", alertWrongPwd: "Mot de passe incorrect.", alertFileSize: "Attention le fichier dÃ©passe la limite maximale, veuillez le compresser", alertNoSpecs: "Aucune spÃ©cification active.", alertSaved: "SauvegardÃ© sur le Cloud !",
    alertDeletePrompt: "ÃŠtes-vous sÃ»r de vouloir supprimer ces donnÃ©es ?", unlockPrompt: "Entrez le mot de passe de sÃ©curitÃ© pour dÃ©verrouiller ce champ :",
    compressImages: "Compresser Images", compressPdf: "Compresser PDF",
    tooltipEdit: "Modifier les donnÃ©es actuelles sans changer la rÃ©vision.",
    confirmEditMsg: "MODIFIER LA VERSION ACTUELLE\n\nCette action vous permet de dÃ©verrouiller et de corriger les donnÃ©es de la fiche actuelle sans modifier le numÃ©ro de rÃ©vision.\n\nVoulez-vous continuer ?",
    tooltipRevise: "Archiver cette version et crÃ©er une nouvelle rÃ©vision.",
    confirmReviseMsg: "CRÃ‰ER UNE NOUVELLE RÃ‰VISION\n\nLa version actuelle sera verrouillÃ©e et sauvegardÃ©e dans l'archive historique.\n\nUne nouvelle fiche mise Ã  jour sera crÃ©Ã©e avec un numÃ©ro de rÃ©vision ultÃ©rieur.\n\nVoulez-vous continuer ?",
    historyBtn: "Historique",
    historyTitle: "Historique",
    showObsolete: "Afficher RÃ©visions", hideObsolete: "Masquer RÃ©visions",
    connected: "ConnectÃ© au Cloud", lastSync: "DerniÃ¨re Synchronisation :",
    pdfReportTitle: "DOSSIER OFFICIEL DE QUALIFICATION FOURNISSEUR",
    sect1: "1. DonnÃ©es de l'Entreprise", rs: "Raison Social", piva: "TVA / NumÃ©ro d'identification", nazione: "Pays", sede: "SiÃ¨ge OpÃ©rationnel", citta: "Ville", provincia: "Province", cap: "Code Postal",
    sect2: "2. Contacts OpÃ©rationnels", dept: "DÃ©partement", name: "Nom et PrÃ©nom", email: "Email", tel: "TÃ©lÃ©phone",
    sect3: "3. Certifications SystÃ¨mes (QualitÃ© et SÃ©curitÃ©)", certType: "Standard / Type", expDate: "Date d'Expiration", attState: "Ã‰tat de la PiÃ¨ce Jointe", loaded: "Document ChargÃ©", missing: "Manquant", notDef: "Non dÃ©fini",
    sect4: "4. DÃ©clarations de ConformitÃ© (OGM, HACCP, AllergÃ¨nes)", decl: "DÃ©claration", outcome: "RÃ©sultat",
    sect5: "5. Gestion des Processus et Logistique", ctrlParam: "ParamÃ¨tre de ContrÃ´le",
    sect6: "6. Grille des AllergÃ¨nes (DÃ©claration de l'Ã‰tablissement)", presImp: "PrÃ©sence en Ã‰tablissement", gestPrev: "Gestion / Notes PrÃ©ventives",
    sect7: "7. Liste des Produits QualifiÃ©s", typology: "Typologie",
    placeAndDate: "Lieu et Date", suppStamp: "Cachet et Signature du Fournisseur", suppRole: "(ReprÃ©sentant LÃ©gal ou Responsable QualitÃ©)", pivotStamp: "Cachet et Signature International Food Pivot", pivotRole: "(DÃ©partement QualitÃ© - Pour prise de connaissance et approbation)",
    yesAccept: "ACCEPTÃ‰ (OUI)", noAccept: "NON ACCEPTÃ‰ (NON)", yesConf: "CONFIRMÃ‰ (OUI)", noConf: "NON CONFIRMÃ‰ (NON)",
    pdfPlaceLabel: "Lieu de Signature", pdfDateLabel: "Date de Signature",
    impegnoTitle: "Lettre d'Engagement Fiches Techniques",
    impegnoDesc: "GÃ©nÃ©rez, signez et tÃ©lÃ©chargez le document d'engagement pour la mise Ã  jour continue des fiches techniques.",
    downloadImpegno: "GÃ©nÃ©rer PDF Engagement", uploadImpegno: "Charger PDF SignÃ©",
    impObj: "Objet : Engagement de mise Ã  jour et de validitÃ© des fiches techniques",
    impSubj: "Le/La soussignÃ©/e, en tant que reprÃ©sentant lÃ©gal ou personne autorisÃ©e au nom de la sociÃ©tÃ© :",
    impDeclTitle: "DÃ‰CLARE ET S'ENGAGE Ã€ :",
    impPoint1: "1. Communiquer rapidement Ã  International Food Pivot Srl toute modification, variation ou mise Ã  jour relative aux fiches techniques des produits/services fournis.",
    impPoint2: "2. ProcÃ©der Ã  la rÃ©vision desdites fiches techniques chaque fois que cela est nÃ©cessaire, pour garantir que les donnÃ©es dÃ©tenues par International Food Pivot Srl sont toujours correctes et actuelles.",
    impCondTitle: "CONDITIONS DE VALIDITÃ‰ :",
    impCondText1: "Il est expressÃ©ment entendu que, si aucune rÃ©vision ou mise Ã  jour n'est effectuÃ©e et communiquÃ©e par",
    impCondText2: ", International Food Pivot Srl considÃ©rera comme valides, correctes et dÃ©finitives les informations contenues dans les fiches techniques fournies jusqu'Ã  ce moment. International Food Pivot Srl est donc dÃ©gagÃ©e de toute responsabilitÃ© dÃ©coulant de l'utilisation de donnÃ©es non mises Ã  jour pour cause de non-communication.",
    impSignClient: "Signature du ReprÃ©sentant LÃ©gal ou Responsable QualitÃ© :"
  },
  es: {
    title: "Food Quality Manager", subtitle: "International Food Pivot Srl - Portal de Calidad",
    admin: "Administrador", adminDesc: "GestiÃ³n de proveedores.",
    qualify: "Ãrea de CualificaciÃ³n", qualifyDesc: "Proceso de cualificaciÃ³n tÃ©cnica.",
    tech: "Ãrea TÃ©cnica", techDesc: "Especificaciones AP 07.2.1 ilimitadas.",
    access: "Entrar", back: "Inicio", save: "Guardar", download: "Descargar PDF",
    tabAnagrafica: "1 ANAGRAFICA", tabContatti: "2 CONTACTOS", tabCertificazioni: "3 CERTIFICACIONES", 
    tabDichiarazioneA: "4 DECLARACIÃ“N A", tabDichiarazioneB: "5 DECLARACIÃ“N B", tabProdotti: "6 PRODUCTOS", 
    tabDossier: "7 DOSSIER", tabDossierFirmato: "8 DOSSIER FIRMADO",
    loginTitle: "Acceso Proveedor", passwordPlaceholder: "CONTRASEÃ‘A",
    ap05_title: "AP 07.2.1 ESPECIFICACIÃ“N DEL PRODUCTO",
    newSpec: "Nueva EspecificaciÃ³n", saveSpec: "Guardar", editSpec: "Editar", reviseSpec: "Revisar",
    exportAll: "Exportar todo (Excel)", exportPdf: "Exportar a PDF", exportPdfIfp: "Exportar a PDF IFP",
    importTech: "Importar Ficha TÃ©cnica", importLog: "Importar Ficha Log.", importMicro: "Datos MicrobiolÃ³gicos", importChem: "Datos QuÃ­micos", importLabel: "Importar Etiqueta", importPhoto: "Foto Producto",
    titleImportTech: "Cargar Documento Ficha TÃ©cnica", titleImportLog: "Cargar Ficha LogÃ­stica", titleImportMicro: "Cargar AnÃ¡lisis MicrobiolÃ³gicos", titleImportChem: "Cargar Datos QuÃ­micos", titleImportLabel: "Cargar Etiqueta (JPG/PNG/PDF)", titleImportPhoto: "Cargar Foto Producto",
    attachedFiles: "Archivos adjuntos:",
    statusArchived: "Archivado", statusRead: "Solo Lectura", statusEdit: "En EdiciÃ³n",
    supplier: "Proveedor", producedIn: "Producido en", packaging: "Material de embalaje", batchFormat: "Formato de lote", batchDecode: "DecodificaciÃ³n de Lote", prepMode: "Modo de etiquetado", intendedUse: "Modo de uso y consumo", storage: "Condiciones de conservaciÃ³n",
    processDesc: "DescripciÃ³n del proceso", envLabel: "Etiqueta ambiental (cÃ³digo de identificaciÃ³n de material y reciclaje)", packMode: "Modo de envasado (al vacÃ­o, atmÃ³sfera protectora, etc.)",
    specDocsTitle: "DocumentaciÃ³n Obligatoria Adjunta", moca: "DeclaraciÃ³n MOCA", haccp: "Plan APPCC", packSheet: "Ficha tÃ©cnica material de embalaje", bio: "CertificaciÃ³n BIO", shelfLife: "ValidaciÃ³n shelf life",
    sc_b: "b) CARACTERÃSTICAS MICROBIOLÃ“GICAS", param: "ParÃ¡metro", limite: "LÃ­mite requerido", risultato: "Resultado", conforme: "Conforme (sÃ­/no)", um: "UM", target: "Objetivo",
    sc_c: "c) DECLARACIÃ“N NUTRICIONAL (por 100g)", element: "Elemento", value: "Valor",
    energyKj: "EnergÃ­a (kJ)", energyKcal: "EnergÃ­a (kcal)", fat: "Grasas (g)", satFat: "de las cuales saturadas (g)", carbs: "Hidratos de carbono (g)", sugar: "de los cuales azÃºcares (g)", fiber: "Fibra (g)", protein: "ProteÃ­nas (g)", salt: "Sal (g)",
    sc_d: "d) CARACTERÃSTICAS QUÃMICAS",
    sc_e: "e) CARACTERÃSTICAS ORGANOLEPTICAS", consistency: "Consistencia", aroma: "Aroma", look: "Apariencia/Color", taste: "Sabor",
    sc_f: "f) DECLARACIÃ“N DE ALÃ‰RGENOS", allergen: "AlÃ©rgeno", presence: "Presencia", traces: "Trazas", yes: "SÃ­", no: "No", notes: "Notas",
    sc_g: "g) DECLARACIÃ“N OGM", containsGmo: "Â¿Contiene OGM?", requiresLabeling: "Â¿Requiere Etiquetado?", notesGmo: "Notas OGM...",
    sc_h: "h) INFORMACIÃ“N LOGÃSTICA", logParam: "ParÃ¡metro", logUvc: "Unidad de Venta", logCarton: "CartÃ³n", logPallet: "Palet",
    eanItfType: "CÃ³digo EAN / ITF / Tipo", dims: "Dimensiones (L x P x A) cm", netDrain: "Peso Neto / Escurrido (g)", tareGross: "Tara / Peso Bruto", composition: "ComposiciÃ³n / Pzas", l: "L", p: "P", h: "A", net: "Neto", drain: "Escurrido", tare: "Tara", gross: "Bruto", pzCarton: "Pzas x CartÃ³n", cLayer: "Cartones x Capa", layers: "Capas x Palet", totCarton: "Tot Cartones", hTot: "Altura Total Palet (cm)", wTot: "Peso Total Palet (kg)",
    alertDelete: "Introduzca la contraseÃ±a de administrador para eliminar:", alertWrongPwd: "ContraseÃ±a incorrecta.", alertFileSize: "AtenciÃ³n el archivo excede el lÃ­mite mÃ¡ximo, por favor comprÃ­melo", alertNoSpecs: "No hay especificaciones activas.", alertSaved: "Â¡Guardado en la Nube!",
    alertDeletePrompt: "Â¿EstÃ¡s seguro de que quieres eliminar estos datos?", unlockPrompt: "Introduzca la contraseÃ±a de seguridad para desbloquear el campo:",
    compressImages: "Comprimir ImÃ¡genes", compressPdf: "Comprimir PDF",
    tooltipEdit: "Editar datos actuales sin cambiar la revisiÃ³n.",
    confirmEditMsg: "EDITAR VERSIÃ“N ACTUAL\n\nEsta acciÃ³n le permite desbloquear y corregir los datos de la ficha actual sin alterar el nÃºmero de revisiÃ³n.\n\nÂ¿Desea continuar?",
    tooltipRevise: "Archivar esta versiÃ³n y crear una nueva revisiÃ³n.",
    confirmReviseMsg: "CREAR NUEVA REVISIÃ“N\n\nLa versiÃ³n actual se bloquearÃ¡ y guardarÃ¡ en el archivo histÃ³rico.\n\nSe crearÃ¡ una nueva ficha actualizada con un nÃºmero de revisiÃ³n posterior.\n\nÂ¿Desea continuar?",
    historyBtn: "Historial",
    historyTitle: "Historial",
    showObsolete: "Mostrar Revisiones", hideObsolete: "Ocultar Revisiones",
    connected: "Conectado al Cloud", lastSync: "Ãšltima SincronizaciÃ³n:",
    pdfReportTitle: "DOSSIER OFICIAL DE CUALIFICACIÃ“N DE PROVEEDOR",
    sect1: "1. Datos de la Empresa", rs: "RazÃ³n Social", piva: "CIF / NIF", nazione: "PaÃ­s", sede: "Sede Operativa", citta: "Ciudad", provincia: "Provincia", cap: "CÃ³digo Postal",
    sect2: "2. Contactos Operativos", dept: "Departamento", name: "Nombre y Apellidos", email: "Email", tel: "TelÃ©fono",
    sect3: "3. Certificaciones de Sistema (Calidad y Seguridad)", certType: "EstÃ¡ndar / Tipo", expDate: "Fecha de Caducidad", attState: "Estado Adjunto", loaded: "Documento Cargado", missing: "Falta", notDef: "No definida",
    sect4: "4. Declaraciones de Conformidad (OGM, APPCC, AlÃ©rgenos)", decl: "DeclaraciÃ³n", outcome: "Resultado",
    sect5: "5. GestiÃ³n de Procesos y Flujos LogÃ­sticos", ctrlParam: "ParÃ¡metro de Control",
    sect6: "6. Matriz de AlÃ©rgenos (DeclaraciÃ³n de InstalaciÃ³n)", presImp: "Presencia en InstalaciÃ³n", gestPrev: "GestiÃ³n / Notas Preventivas",
    sect7: "7. Lista de Productos Cualificados", typology: "TipologÃ­a",
    placeAndDate: "Lugar y Fecha", suppStamp: "Sello y Firma del Proveedor", suppRole: "(Representante Legal o Responsable de Calidad)", pivotStamp: "Sello y Firma International Food Pivot", pivotRole: "(Departamento de Calidad - Para conocimiento y aprobaciÃ³n)",
    yesAccept: "ACEPTADO (SÃ)", noAccept: "NO ACEPTADO (NO)", yesConf: "CONFIRMADO (SÃ)", noConf: "NO CONFIRMADO (NO)",
    pdfPlaceLabel: "Lugar de la Firma", pdfDateLabel: "Fecha de la Firma",
    impegnoTitle: "Carta de Compromiso Fichas TÃ©cnicas",
    impegnoDesc: "Genere, firme y cargue el documento de compromiso para la actualizaciÃ³n continua de las fichas tÃ©cnicas.",
    downloadImpegno: "Generar PDF Compromiso", uploadImpegno: "Cargar PDF Firmado",
    impObj: "Asunto: Compromiso de actualizaciÃ³n y validez de las fichas tÃ©cnicas",
    impSubj: "El/La abajo firmante, en calidad de representante legal o persona autorizada en nombre de la empresa:",
    impDeclTitle: "DECLARA Y SE COMPROMETE A:",
    impPoint1: "1. Comunicar puntualmente a International Food Pivot Srl cualquier cambio, variaciÃ³n o actualizaciÃ³n relacionada con las fichas tÃ©cnicas de los productos/servicios proporcionados.",
    impPoint2: "2. Proceder a la revisiÃ³n de dichas fichas tÃ©cnicas siempre que sea necesario, para garantizar que los datos en poder de International Food Pivot Srl sean siempre correctos y actuales.",
    impCondTitle: "CONDICIONES DE VALIDEZ:",
    impCondText1: "Queda expresamente entendido que, si no se realiza y comunica ninguna revisiÃ³n o actualizaciÃ³n por parte de",
    impCondText2: ", International Food Pivot Srl considerarÃ¡ como vÃ¡lida, correcta y definitiva la informaciÃ³n contenida en las fichas tÃ©cnicas proporcionadas hasta ese momento. International Food Pivot Srl queda, por tanto, eximida de cualquier responsabilidad derivada del uso de datos obsoletos por falta de comunicaciÃ³n.",
    impSignClient: "Firma del Representante Legal o Responsable de Calidad:"
  }
};

// --- COMPONENTI UI GLOBALI ---
const LangSwitcherUI = ({ currentLang, setLang }) => (
  <div className="flex gap-1 bg-white/90 p-1.5 rounded-2xl border border-slate-200 shadow-xl backdrop-blur-md">
    {['it', 'en', 'fr', 'es'].map(l => (
      <button key={l} onClick={() => setLang(l)} className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${currentLang === l ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>{l.toUpperCase()}</button>
    ))}
  </div>
);

const GlobalTools = ({ lang, setLang, t }) => (
  <div className="fixed bottom-8 right-8 flex flex-col items-end gap-3 z-[100] pointer-events-none">
    <div className="flex gap-3 pointer-events-auto">
        <a href="https://squoosh.app/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-amber-500/95 backdrop-blur text-white px-5 py-3 rounded-2xl shadow-xl text-[10px] font-black uppercase hover:bg-amber-600 hover:-translate-y-1 transition-all border border-white/20">
           <ImageIcon size={16}/> {t('compressImages')}
        </a>
        <a href="https://www.ilovepdf.com/it" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-red-600/95 backdrop-blur text-white px-5 py-3 rounded-2xl shadow-xl text-[10px] font-black uppercase hover:bg-red-700 hover:-translate-y-1 transition-all border border-white/20">
           <FileDown size={16}/> {t('compressPdf')}
        </a>
    </div>
    <div className="pointer-events-auto">
      <LangSwitcherUI currentLang={lang} setLang={setLang} />
    </div>
  </div>
);

// --- COMPONENTE PRINCIPALE ---
const App = () => {
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState('it');
  const [view, setView] = useState('home'); 
  const [adminAuth, setAdminAuth] = useState(false);
  const [activeTab, setActiveTab] = useState('ANAGRAFICA');
  const [inputPass, setInputPass] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [masterLogo, setMasterLogo] = useState(null);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const [globalConfig, setGlobalConfig] = useState({
    allergeni: [...ALLERGENI_DETTAGLIATI],
    impegniA: [...DEFAULT_IMPEGNI_A],
    impegniB: [...DEFAULT_IMPEGNI_B]
  });

  const isTestUser = currentSupplier?.name?.toUpperCase() === 'TEST' || currentSupplier?.name?.toUpperCase() === 'DEMO';

  const [qualData, setQualData] = useState({
    anagrafica: { rs: '', piva: '', sede: '', citta: '', provincia: '', cap: '', nazione: '' },
    contatti: { sales: { nome: '', email: '', tel: '' }, marketing: { nome: '', email: '', tel: '' }, qualita: { nome: '', email: '', tel: '' }, amministrazione: { nome: '', email: '', tel: '' }, customer: { nome: '', email: '', tel: '' }, logistica: { nome: '', email: '', tel: '' } },
    certificazioni: [
      { id: 'ifs', type: 'IFS Food', fileName: '', expiry: '' }, 
      { id: 'brc', type: 'BRCGS Food', fileName: '', expiry: '' },
      { id: 'haccp', type: 'Manuale / Piano HACCP', fileName: '', expiry: '' },
      { id: 'bio', type: 'Certificazione Biologica', fileName: '', expiry: '' },
      { id: 'moca', type: 'Certificazione MOCA (Materiali a contatto con alimenti)', fileName: '', expiry: '' }
    ],
    fileA: { impegni: [], allergeniPresence: {}, allergeniGestione: {}, allergeniNotes: {} },
    fileB: {},
    fileC: [{ id: 1, tipologia: 'Materia prima', denominazione: '', origine: '', shelfLife: '' }],
    signedDossier: { fileName: '', fileData: null },
    impegnoSchede: { fileName: '', fileData: null, place: '', date: new Date().toISOString().split('T')[0] },
    pdfPlace: '',
    pdfDate: new Date().toISOString().split('T')[0]
  });

  const [productSpecs, setProductSpecs] = useState([]);
  const [expandedSpecId, setExpandedSpecId] = useState(null);
  const [showObsoleteSpecs, setShowObsoleteSpecs] = useState(false);
  const [unlockedFields, setUnlockedFields] = useState({});
  const [isExtracting, setIsExtracting] = useState(false);
  const [historyModal, setHistoryModal] = useState({ isOpen: false, spec: null });

  // Modal State
  const [modal, setModal] = useState({ isOpen: false, type: '', message: '', showInput: false, inputValue: '', onConfirm: null, onCancel: null });

  const t = (key) => translations[lang]?.[key] || translations['it']?.[key] || key;
  
  const goHome = () => { setView('home'); setAdminAuth(false); setCurrentSupplier(null); setInputPass(''); setActiveTab('ANAGRAFICA'); setEditingSupplier(null); setExpandedSpecId(null); };

  // --- MODAL HELPERS ---
  const showAlert = (message) => {
    setModal({ isOpen: true, type: 'alert', message, onConfirm: () => setModal({isOpen: false, type: '', message: '', showInput: false, inputValue: '', onConfirm: null, onCancel: null}), showInput: false, inputValue: '' });
  };

  const showConfirm = (message, onConfirmCallback) => {
    setModal({
      isOpen: true, type: 'confirm', message, showInput: false, inputValue: '',
      onConfirm: () => { onConfirmCallback(); setModal({isOpen: false, type: '', message: '', showInput: false, inputValue: '', onConfirm: null, onCancel: null}); },
      onCancel: () => setModal({isOpen: false, type: '', message: '', showInput: false, inputValue: '', onConfirm: null, onCancel: null})
    });
  };

  const showPrompt = (message, onConfirmCallback) => {
    setModal({
      isOpen: true, type: 'prompt', message, showInput: true, inputValue: '',
      onConfirm: (val) => { onConfirmCallback(val); setModal({isOpen: false, type: '', message: '', showInput: false, inputValue: '', onConfirm: null, onCancel: null}); },
      onCancel: () => setModal({isOpen: false, type: '', message: '', showInput: false, inputValue: '', onConfirm: null, onCancel: null})
    });
  };

  const unlockField = (specId, fieldName) => {
    showPrompt(t('unlockPrompt'), (pwd) => {
      if (pwd === "0404") {
        setUnlockedFields(prev => ({...prev, [`${specId}_${fieldName}`]: true}));
      } else {
        showAlert(t('alertWrongPwd'));
      }
    });
  };

  // --- SYNC BACKEND (MYSQL) ---
  const fetchSuppliers = async () => {
    try {
      const data = await api.getSuppliers();
      let dbList = data.suppliers || [];
      const hasTest = dbList.some(s => (s.name || '').toUpperCase() === 'TEST');
      const hasDemo = dbList.some(s => (s.name || '').toUpperCase() === 'DEMO');

      if (!hasTest) {
         dbList.unshift({ id: 'test-profile-sys', name: 'TEST', qualPass: 'test', techPass: 'test', status: 'active' });
      }
      if (!hasDemo) {
         dbList.unshift({ id: 'demo-profile-sys', name: 'DEMO', qualPass: '1', techPass: '1', status: 'active' });
      }
      setSuppliers(dbList);
      setUser({ online: true });
    } catch (e) {
      setUser(null);
      console.error('Errore caricamento fornitori:', e);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    const poll = setInterval(fetchSuppliers, 10000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadGlobalConfig = async () => {
      try {
        const data = await api.getSettings();
        if (data.logo) setMasterLogo(data.logo);
        if (data.templates) {
          setGlobalConfig(prev => ({
             allergeni: data.templates.allergeni || prev.allergeni,
             impegniA: data.templates.impegniA || prev.impegniA,
             impegniB: data.templates.impegniB || prev.impegniB
          }));
        }
      } catch (e) {
        console.error('Errore caricamento configurazione globale:', e);
      }
    };
    loadGlobalConfig();
  }, [user]);

  useEffect(() => {
    if (!currentSupplier || !user) return;
    const loadData = async () => {
      try {
        const d = await api.getQualifications(currentSupplier.id);
        if (d && d.qualData) {
           setQualData(prev => ({
              ...prev,
              ...d.qualData,
              anagrafica: { ...(prev.anagrafica || {}), ...(d.qualData.anagrafica || {}) },
              contatti: { ...(prev.contatti || {}), ...(d.qualData.contatti || {}) },
              certificazioni: d.qualData.certificazioni || prev.certificazioni || [],
              fileA: { ...(prev.fileA || {}), ...(d.qualData.fileA || {}) },
              fileB: { ...(prev.fileB || {}), ...(d.qualData.fileB || {}) },
              fileC: d.qualData.fileC || prev.fileC || []
           }));
        }
        if (d && d.productSpecs) setProductSpecs(d.productSpecs || []);
        if (d && d.lastUpdate) {
           setLastSyncTime(new Date(d.lastUpdate).toLocaleString(lang));
        } else {
           setProductSpecs([]);
           setLastSyncTime(null);
        }
      } catch (e) {
         console.error('Errore caricamento dati qualifica:', e);
         setProductSpecs([]);
         setLastSyncTime(null);
      }
    };
    loadData();
  }, [currentSupplier, user, lang]);

  // --- HANDLERS GLOBALI TEMPLATES ---
  const saveGlobalTemplates = async () => {
    try {
      await api.saveSettings({ templates: globalConfig });
      showAlert("Modifiche salvate globalmente e applicate a tutti i fornitori.");
    } catch (e) {
      console.error(e);
    }
  };

  const updateGlobalImpegnoA = (idx, langKey, val) => {
    const newArr = [...(globalConfig.impegniA || [])];
    if(typeof newArr[idx] === 'string') {
        const str = newArr[idx];
        newArr[idx] = { id: `impA_${Date.now()}`, it: str, en: str, fr: str, es: str };
    }
    newArr[idx] = {...newArr[idx], [langKey]: val};
    setGlobalConfig({...globalConfig, impegniA: newArr});
  };
  
  const addGlobalImpegnoA = () => {
    setGlobalConfig({...globalConfig, impegniA: [...(globalConfig.impegniA || []), { id: `impA_${Date.now()}`, it: "Nuova dichiarazione...", en: "New declaration...", fr: "Nouvelle dÃ©claration...", es: "Nueva declaraciÃ³n..." }]});
  };
  
  const removeGlobalImpegnoA = (idx) => {
    showConfirm("Eliminare questo impegno globalmente?", () => {
       setGlobalConfig({...globalConfig, impegniA: (globalConfig.impegniA || []).filter((_, i) => i !== idx)});
    });
  };

  const updateGlobalImpegnoB = (id, field, val) => {
    setGlobalConfig({...globalConfig, impegniB: (globalConfig.impegniB || []).map(b => b.id === id ? {...b, [field]: val} : b)});
  };
  
  const addGlobalImpegnoB = () => {
    setGlobalConfig({...globalConfig, impegniB: [...(globalConfig.impegniB || []), {id: Date.now().toString(), title_it: "Nuovo Titolo", desc_it: "Descrizione...", title_en: "New Title", desc_en: "Description...", title_fr: "Nouveau Titre", desc_fr: "Description...", title_es: "Nuevo TÃ­tulo", desc_es: "DescripciÃ³n..."}]});
  };
  
  const removeGlobalImpegnoB = (id) => {
    showConfirm("Eliminare questo badge logistica globalmente?", () => {
       setGlobalConfig({...globalConfig, impegniB: (globalConfig.impegniB || []).filter(b => b.id !== id)});
    });
  };

  const updateGlobalAllergen = (idx, langKey, val) => {
    const newArr = [...(globalConfig.allergeni || [])];
    newArr[idx] = {...newArr[idx], [langKey]: val};
    setGlobalConfig({...globalConfig, allergeni: newArr});
  };
  
  const addGlobalAllergen = () => {
    setGlobalConfig({...globalConfig, allergeni: [...(globalConfig.allergeni || []), { id: Date.now(), it: "Nuovo Allergene", en: "New Allergene", fr: "Nouvel AllergÃ¨ne", es: "Nuevo AlÃ©rgeno" }]});
  };
  
  const removeGlobalAllergen = (idx) => {
    showConfirm("Eliminare questo allergene globalmente?", () => {
       setGlobalConfig({...globalConfig, allergeni: (globalConfig.allergeni || []).filter((_, i) => i !== idx)});
    });
  };

  // --- HANDLERS ---
  const handleMasterLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        showAlert(`${t('alertFileSize')} 5 MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;
        setMasterLogo(base64);
        try { await api.saveSettings({ logo: base64 }); } catch (e) {}
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMasterLogoDelete = (e) => {
    e.stopPropagation();
    showConfirm(t('alertDeletePrompt'), async () => {
      setMasterLogo(null);
      try { await api.saveSettings({ logo: null }); } catch (e) {}
    });
  };

  const handleLogin = (area) => {
    const s = (suppliers || []).find(x => area === 'qual' ? x.qualPass === inputPass : x.techPass === inputPass);
    if (s) { setCurrentSupplier(s); setView(area === 'qual' ? 'supplier_qual' : 'supplier_tech'); }
    else showAlert(t('alertWrongPwd'));
  };

  const saveToCloud = async (newData, newSpecs) => {
    if (!currentSupplier) return;
    try {
      const timestamp = new Date();
      await api.saveQualifications(currentSupplier.id, { 
        qualData: newData || qualData, 
        productSpecs: newSpecs || productSpecs, 
        lastUpdate: timestamp.toISOString() 
      });
      setLastSyncTime(timestamp.toLocaleString(lang));
    } catch (e) { console.error("Errore salvataggio:", e); }
  };

  const saveProgress = async () => {
    await saveToCloud(qualData, productSpecs);
    showAlert(t('alertSaved'));
  };

  const updateAnagrafica = (field, value) => {
    setQualData(prev => ({
      ...prev,
      anagrafica: { ...(prev.anagrafica || {}), [field]: value }
    }));
  };

  const updateContatti = (dept, field, val) => {
    setQualData(prev => ({...prev, contatti: {...(prev.contatti || {}), [dept]: {...(prev.contatti?.[dept] || {}), [field]: val}}}));
  };

  const updateCert = (id, field, val) => {
    setQualData(prev => ({...prev, certificazioni: (prev.certificazioni || []).map(c => c.id === id ? {...c, [field]: val} : c)}));
  };

  const addCert = () => {
    setQualData(prev => ({
      ...prev,
      certificazioni: [...(prev.certificazioni || []), { id: Date.now().toString(), type: 'Nuova Certificazione...', fileName: '', expiry: '' }]
    }));
  };

  const removeCert = (id) => {
    showConfirm(t('alertDeletePrompt'), () => {
      setQualData(prev => {
        const newQualData = { ...prev, certificazioni: (prev.certificazioni || []).filter(c => c.id !== id) };
        saveToCloud(newQualData, productSpecs);
        return newQualData;
      });
    });
  };

  const getCertStatus = (expiryDate) => {
    if (!expiryDate) return { label: 'Data mancante', color: 'bg-slate-100 text-slate-500 border-slate-200' };
    const today = new Date();
    today.setHours(0,0,0,0);
    const exp = new Date(expiryDate);
    const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: 'SCADUTA', color: 'bg-red-100 text-red-700 border-red-300' };
    if (diffDays <= 30) return { label: 'IN SCADENZA', color: 'bg-orange-100 text-orange-700 border-orange-300' };
    return { label: 'VALIDA', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' };
  };

  const handleCertUpload = (id, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 600 * 1024 * 1024) {
        showAlert(`${t('alertFileSize')} 600 MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setQualData(prev => ({...prev, certificazioni: (prev.certificazioni || []).map(c => c.id === id ? {...c, fileName: file.name, fileData: reader.result} : c)}));
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteCertFile = (id) => {
    showConfirm(t('alertDeletePrompt'), () => {
      setQualData(prev => {
        const newQualData = {...prev, certificazioni: (prev.certificazioni || []).map(c => c.id === id ? {...c, fileName: '', fileData: null} : c)};
        saveToCloud(newQualData, productSpecs);
        return newQualData;
      });
    });
  };

  const updateFileAImpegno = (idx, val) => {
    setQualData(prev => {
      const newImp = Array.isArray(prev.fileA?.impegni) ? [...prev.fileA.impegni] : [];
      newImp[idx] = val;
      return {...prev, fileA: {...(prev.fileA || {}), impegni: newImp}};
    });
  };

  const updateFileAAllergene = (id, field, val) => {
    setQualData(prev => ({
      ...prev, 
      fileA: {
        ...(prev.fileA || {}), 
        [field]: {...(prev.fileA?.[field] || {}), [id]: val}
      }
    }));
  };

  const updateFileB = (field, val) => {
    setQualData(prev => ({...prev, fileB: {...(prev.fileB || {}), [field]: val}}));
  };

  const updateFileC = (id, field, val) => {
    setQualData(prev => ({...prev, fileC: (prev.fileC || []).map(p => p.id === id ? {...p, [field]: val} : p)}));
  };

  const addFileCRow = () => {
    setQualData(prev => ({...prev, fileC: [...(prev.fileC || []), { id: Date.now(), tipologia: 'Materia prima', denominazione: '', origine: '', shelfLife: '' }]}));
  };

  const removeFileCRow = (id) => {
    showConfirm(t('alertDeletePrompt'), () => {
      setQualData(prev => {
        const newQualData = {...prev, fileC: (prev.fileC || []).filter(p => p.id !== id)};
        saveToCloud(newQualData, productSpecs);
        return newQualData;
      });
    });
  };

  const handleSignedUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 600 * 1024 * 1024) {
        showAlert(`${t('alertFileSize')} 600 MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setQualData(prev => ({...prev, signedDossier: {fileName: file.name, fileData: reader.result}}));
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteSignedFile = () => {
    showConfirm(t('alertDeletePrompt'), () => {
      setQualData(prev => {
        const newQualData = {...prev, signedDossier: {fileName: '', fileData: null}};
        saveToCloud(newQualData, productSpecs);
        return newQualData;
      });
    });
  };

  // --- LETTERA IMPEGNO LOGIC ---
  const handleImpegnoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 600 * 1024 * 1024) {
        showAlert(`${t('alertFileSize')} 600 MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setQualData(prev => {
          const newData = {...prev, impegnoSchede: {...(prev.impegnoSchede || {}), fileName: file.name, fileData: reader.result}};
          saveToCloud(newData, productSpecs);
          return newData;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteImpegnoFile = () => {
    showConfirm(t('alertDeletePrompt'), () => {
      setQualData(prev => {
        const newData = {...prev, impegnoSchede: {...(prev.impegnoSchede || {}), fileName: '', fileData: null}};
        saveToCloud(newData, productSpecs);
        return newData;
      });
    });
  };

  const generateImpegnoPDF = () => {
    const win = window.open('', '_blank');
    if (!win) return;

    const place = qualData.impegnoSchede?.place || '_________________';
    const dateStr = qualData.impegnoSchede?.date ? new Date(qualData.impegnoSchede.date).toLocaleDateString(lang) : '_________________';
    const rs = qualData.anagrafica?.rs || currentSupplier?.name || '[NOME_AZIENDA_CLIENTE]';

    win.document.write(`
      <html>
        <head>
          <title>${t('impegnoTitle')} - ${rs}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 0; color: #1e293b; font-size: 11px; line-height: 1.6; }
            h1 { text-align: center; font-size: 16px; text-transform: uppercase; margin-bottom: 30px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; color: #0f172a; }
            p { margin-bottom: 15px; }
            .bold { font-weight: bold; color: #0f172a; }
            ol { margin-bottom: 20px; }
            li { margin-bottom: 10px; }
            .sign-container { margin-top: 80px; display: flex; justify-content: space-between; text-align: center; page-break-inside: avoid; gap: 30px; }
            .sign-box { border-top: 1px solid #0f172a; flex: 1; padding-top: 10px; font-weight: bold; font-size: 11px; color: #0f172a; }
          </style>
        </head>
        <body>
          <table style="width: 100%; border-bottom: 3px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; border-collapse: collapse;">
            <tr>
              <td style="width: 40%; text-align: left; vertical-align: top; border: none; padding: 0;">
                ${masterLogo ? `<img src="${masterLogo}" style="max-height: 70px; object-fit: contain;" />` : ''}
              </td>
              <td style="width: 60%; text-align: right; vertical-align: top; font-size: 10px; line-height: 1.5; border: none; padding: 0; color: #475569;">
                <strong style="font-size: 13px; text-transform: uppercase; color: #0f172a;">International Food Pivot Srl</strong><br>
                Sede legale ed operativa<br>
                Piazza Duca Dâ€™Aosta, 12<br>
                20124 Milano â€“ Italia<br>
                Partita IVA 11514530960<br>
                ordini@italianfoodpivot.it<br>
                amministrazione@italianfoodpivot.it<br>
                PEC: internationalfoodpivot@legalmail.it<br>
                Codice SDI SUBM70N<br>
                Tel. +39 02 82197510
              </td>
            </tr>
          </table>
          <h1>${t('impObj')}</h1>
          <p>${t('impSubj')}</p>
          <p><span class="bold">${t('rs')}:</span> ${rs}</p>

          <p class="bold">${t('impDeclTitle')}</p>
          <ol>
            <li>${t('impPoint1')}</li>
            <li>${t('impPoint2')}</li>
          </ol>

          <p><span class="bold">${t('impCondTitle')}</span> ${t('impCondText1')} <span class="bold">${rs}</span>${t('impCondText2')}</p>

          <div class="sign-container">
            <div class="sign-box">
              <span class="bold">${t('placeAndDate')}</span><br><br><br>
              ${place}, ${dateStr}
            </div>
            <div class="sign-box">
              <span class="bold">${t('impSignClient')}</span><br><br><br>
              ____________________________________
            </div>
          </div>
          <script>
            setTimeout(() => { window.print(); }, 500);
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  // --- SPECIFICA TECNICA LOGIC ---
  const addTechSpec = () => {
    const newSpec = {
      id: Date.now().toString(),
      familyId: Date.now().toString(),
      isSaved: false,
      saveDate: null,
      isObsolete: false,
      importFlags: {},
      master: { nome: '', codice: '' },
      header: { uvcWeight: '', ean: '', approvalDate: '', revision: 0 },
      a: { 
        legalName: '', brand: '', brandLogo: null, giorniGarantiti: '', claim: '', tmc: '', ingredients: '', packaging: '', batchFormat: '', batchDecode: '', 
        tmcFormat: '', prepMode: '', intendedUse: '', storage: '', supplier: '', producedIn: '',
        processDesc: '', envLabel: '', packMode: ''
      },
      b: Array.from({ length: 5 }, (_, i) => ({ id: i + 1, p: '', limite: '', risultato: '', conforme: '' })),
      c: [
        { id: 1, p: t('energyKj'), v: '' }, { id: 2, p: t('energyKcal'), v: '' },
        { id: 3, p: t('fat'), v: '' }, { id: 4, p: t('satFat'), v: '' },
        { id: 5, p: t('carbs'), v: '' }, { id: 6, p: t('sugar'), v: '' },
        { id: 7, p: t('fiber'), v: '' }, { id: 8, p: t('protein'), v: '' },
        { id: 9, p: t('salt'), v: '' }, { id: 10, p: '', v: '' }, { id: 11, p: '', v: '' }
      ],
      d: Array.from({ length: 5 }, (_, i) => ({ id: i + 1, p: '', limite: '', risultato: '', conforme: '' })),
      e: { consistency: '', aroma: '', look: '', taste: '' },
      f: (globalConfig.allergeni || []).map(all => ({ id: all.id, it: all.it, presenza: t('no'), tracce: t('no'), note: '' })),
      g: { containsGmo: t('no'), statement: '' },
      log: {
        uvc: { ean: '', pesoNetto: '', pesoSgocc: '', tara: '', pesoLordo: '', l: '', p: '', h: '' },
        box: { itf: '', pz: '', tara: '', pesoLordo: '', l: '', p: '', h: '' },
        pallet: { tipo: '', cLayer: '', layers: '', totC: '', alt: '', pesoTot: '' }
      },
      attachedSheets: [],
      photos: [],
      specDocs: {}
    };
    
    const updatedSpecs = [newSpec, ...(productSpecs || [])];
    setProductSpecs(updatedSpecs);
    setExpandedSpecId(newSpec.id);
  };

  const updateSpecField = (specId, path, val) => {
    setProductSpecs(prev => (prev || []).map(s => {
      if (s.id !== specId) return s;
      const copy = JSON.parse(JSON.stringify(s));
      const parts = path.split('.');
      let target = copy;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!target[parts[i]]) target[parts[i]] = {};
        target = target[parts[i]];
      }
      target[parts[parts.length - 1]] = val;
      return copy;
    }));
  };

  const updateSpecTable = (specId, table, rowId, field, val) => {
    setProductSpecs(prev => (prev || []).map(s => {
      if (s.id !== specId) return s;
      const copy = { ...s };
      copy[table] = (copy[table] || []).map(r => r.id === rowId ? { ...r, [field]: val } : r);
      return copy;
    }));
  };

  const addTableRow = (specId, table) => {
    setProductSpecs(prev => (prev || []).map(s => {
      if (s.id !== specId) return s;
      const copy = { ...s };
      let newRow;
      if (table === 'f') {
        newRow = { id: Date.now(), it: "Nuovo Allergene", presenza: t('no'), tracce: t('no'), note: '' };
      } else if (table === 'b' || table === 'd') {
        newRow = { id: Date.now(), p: '', limite: '', risultato: '', conforme: '' };
      } else {
        newRow = { id: Date.now(), p: '', target: '', toll: '', um: '', v: '' };
      }
      copy[table] = [...(copy[table] || []), newRow];
      return copy;
    }));
  };

  const deleteTechSpec = (id) => {
    showPrompt(t('alertDelete'), (pwd) => {
      if (pwd === "0404") {
        setProductSpecs(prev => {
          const newSpecs = (prev || []).filter(s => s.id !== id);
          saveToCloud(qualData, newSpecs);
          return newSpecs;
        });
      } else {
        showAlert(t('alertWrongPwd'));
      }
    });
  };

  const saveSpec = (specId) => {
    setProductSpecs(prev => {
      const newSpecs = (prev || []).map(s => {
        if (s.id !== specId) return s;
        return { ...s, isSaved: true, saveDate: new Date().toLocaleDateString() };
      });
      saveToCloud(qualData, newSpecs);
      showAlert(t('alertSaved'));
      return newSpecs;
    });
  };

  const toggleEditSpec = (specId) => {
    setProductSpecs(prev => (prev || []).map(s => {
      if (s.id !== specId) return s;
      return { ...s, isSaved: false };
    }));
  };

  const reviseSpec = (specId) => {
    const specToRevise = (productSpecs || []).find(s => s.id === specId);
    if (!specToRevise) return;
    
    const newRevision = JSON.parse(JSON.stringify(specToRevise));
    newRevision.id = Date.now().toString();
    if (!newRevision.familyId) newRevision.familyId = specToRevise.familyId || specToRevise.id;
    newRevision.isSaved = false;
    newRevision.isObsolete = false;
    newRevision.saveDate = null;
    newRevision.header.revision = parseInt(newRevision.header.revision || 0) + 1;
    
    setProductSpecs(prev => {
      const newSpecs = (prev || []).map(s => s.id === specId ? { ...s, isObsolete: true, isSaved: true } : s);
      newSpecs.unshift(newRevision);
      saveToCloud(qualData, newSpecs);
      return newSpecs;
    });
    setExpandedSpecId(newRevision.id);
  };

  const handleMultipleFileUpload = async (specId, fieldName, maxMb, event, importType = null) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    const maxSize = maxMb * 1024 * 1024;
    const validFiles = files.filter(f => {
      if (f.size > maxSize) {
        showAlert(`${t('alertFileSize')} ${maxMb} MB.`);
        return false;
      }
      return true;
    });

    const hasPdfToImage = validFiles.some(f => f.type === 'application/pdf' && fieldName === 'photos');
    
    if (hasPdfToImage) {
      setIsExtracting(true);
    }

    const filePromises = validFiles.map(file => {
      return new Promise(async (resolve) => {
        if (file.type === 'application/pdf' && fieldName === 'photos') {
          try {
            const pdfjsLib = await loadPdfJs();
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            context.fillStyle = 'white';
            context.fillRect(0, 0, canvas.width, canvas.height);

            await page.render({ canvasContext: context, viewport: viewport }).promise;
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve({ name: file.name.replace('.pdf', ' (Anteprima).jpg'), data: dataUrl });
            return;
          } catch (err) {
            console.error("PDF to image error", err);
          }
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({ name: file.name, data: reader.result });
        };
        reader.readAsDataURL(file);
      });
    });

    const newUploadedFiles = await Promise.all(filePromises);

    setProductSpecs(prev => {
      const newSpecs = (prev || []).map(s => {
        if (s.id !== specId) return s;
        const existingFiles = s[fieldName] || [];
        return { 
           ...s, 
           [fieldName]: [...existingFiles, ...newUploadedFiles],
           importFlags: importType ? { ...(s.importFlags || {}), [importType]: true } : s.importFlags
        };
      });
      saveToCloud(qualData, newSpecs);
      return newSpecs;
    });

    if (hasPdfToImage) setIsExtracting(false);
  };

  const removeSpecFile = (specId, fieldName, indexToRemove) => {
    showConfirm(t('alertDeletePrompt'), () => {
      setProductSpecs(prev => {
        const newSpecs = (prev || []).map(s => {
          if (s.id !== specId) return s;
          const copy = { ...s };
          copy[fieldName] = (copy[fieldName] || []).filter((_, idx) => idx !== indexToRemove);
          return copy;
        });
        saveToCloud(qualData, newSpecs);
        return newSpecs;
      });
    });
  };

  const handleBrandLogoUpload = async (specId, event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024 * 1024) {
      showAlert(`${t('alertFileSize')} 500 MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setProductSpecs(prev => {
        const newSpecs = (prev || []).map(s => s.id === specId ? { ...s, a: { ...(s.a || {}), brandLogo: reader.result } } : s);
        saveToCloud(qualData, newSpecs);
        return newSpecs;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSpecDocUpload = (specId, docKey, event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 600 * 1024 * 1024) {
      showAlert(`${t('alertFileSize')} 600 MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProductSpecs(prev => {
        const newSpecs = (prev || []).map(s => {
          if (s.id !== specId) return s;
          return {
            ...s,
            specDocs: {
              ...(s.specDocs || {}),
              [docKey]: { name: file.name, data: reader.result }
            }
          };
        });
        saveToCloud(qualData, newSpecs);
        return newSpecs;
      });
    };
    reader.readAsDataURL(file);
  };

  const removeSpecDoc = (specId, docKey) => {
    showConfirm(t('alertDeletePrompt'), () => {
      setProductSpecs(prev => {
        const newSpecs = (prev || []).map(s => {
          if (s.id !== specId) return s;
          const newDocs = { ...(s.specDocs || {}) };
          delete newDocs[docKey];
          return { ...s, specDocs: newDocs };
        });
        saveToCloud(qualData, newSpecs);
        return newSpecs;
      });
    });
  };

  // --- EXPORTS ---
  const exportAllSpecsToCSV = () => {
    const validSpecs = (productSpecs || []).filter(s => !s.isObsolete);
    if (validSpecs.length === 0) {
      showAlert(t('alertNoSpecs'));
      return;
    }

    let csv = "data:text/csv;charset=utf-8,";
    csv += "CATALOGO SPECIFICHE TECNICHE AP 07.2.1 (Solo Attive)\n\n";

    validSpecs.forEach((spec, index) => {
      csv += `--- SCHEDA PRODOTTO ${index + 1} ---\n`;
      csv += `Codice Prodotto;${spec.master?.codice || ''}\n`;
      csv += `Nome Commerciale;${spec.master?.nome || ''}\n`;
      csv += `Revisione;${spec.header?.revision || '0'}\n`;
      csv += `Peso UVC (g);${spec.header?.uvcWeight || ''}\n`;
      csv += `Codice EAN;${spec.header?.ean || ''}\n`;
      
      csv += "\na) CARATTERISTICHE COMMERCIALI\n";
      csv += `Denominazione legale;${spec.a?.legalName || ''}\n`;
      csv += `Brand;${spec.a?.brand || ''}\n`;
      csv += `Claim;${spec.a?.claim || ''}\n`;
      csv += `Ingredienti;${spec.a?.ingredients?.replace(/\n/g, " ") || ''}\n`;
      csv += `Shelf life;${spec.a?.tmc || ''}\n`;
      csv += `Formato;${spec.a?.tmcFormat || ''}\n`;
      csv += `Giorni garantiti alla consegna;${spec.a?.giorniGarantiti || ''}\n`;
      csv += `Fornitore;${spec.a?.supplier || ''}\n`;
      csv += `Prodotto in;${spec.a?.producedIn || ''}\n`;
      csv += `Materiale Imballo;${spec.a?.packaging || ''}\n`;
      csv += `Formato Lotto;${spec.a?.batchFormat || ''}\n`;
      csv += `Decodifica Lotto;${spec.a?.batchDecode?.replace(/\n/g, " ") || ''}\n`;
      csv += `ModalitÃ  di etichettatura;${spec.a?.prepMode || ''}\n`;
      csv += `ModalitÃ  d'uso e consumo;${spec.a?.intendedUse || ''}\n`;
      csv += `Condizioni conservazione;${spec.a?.storage || ''}\n`;
      csv += `Descrizione del processo;${spec.a?.processDesc?.replace(/\n/g, " ") || ''}\n`;
      csv += `Etichetta ambientale;${spec.a?.envLabel?.replace(/\n/g, " ") || ''}\n`;
      csv += `ModalitÃ  di confezionamento;${spec.a?.packMode || ''}\n`;

      csv += "\nb) MICROBIOLOGIA\n";
      (spec.b || []).forEach(r => { if(r.p) csv += `${r.p || ''};${r.limite || ''};${r.risultato || ''};${r.conforme || ''}\n`; });

      csv += "\nc) DICHIARAZIONE NUTRIZIONALE\n";
      (spec.c || []).forEach(r => { if(r.p || r.v) csv += `${r.p || ''};${r.v || ''}\n`; });

      csv += "\nd) CARATTERISTICHE CHIMICHE\n";
      (spec.d || []).forEach(r => { if(r.p) csv += `${r.p || ''};${r.limite || ''};${r.risultato || ''};${r.conforme || ''}\n`; });

      csv += "\ne) CARATTERISTICHE ORGANOLETTICHE\n";
      csv += `Consistenza;${spec.e?.consistency || ''}\n`;
      csv += `Aroma;${spec.e?.aroma || ''}\n`;
      csv += `Apparenza/Colore;${spec.e?.look || ''}\n`;
      csv += `Sapore;${spec.e?.taste || ''}\n`;

      csv += "\nf) DICHIARAZIONE ALLERGENI\n";
      (spec.f || []).forEach(r => { 
        const allergenName = r.it || ((globalConfig.allergeni || []).find(a => a.id === r.id) || {})[lang] || r.it || '';
        csv += `${allergenName};${r.presenza || ''};${r.tracce || ''};${r.note || ''}\n`; 
      });

      csv += "\ng) DICHIARAZIONE OGM\n";
      csv += `Contiene OGM?;${spec.g?.containsGmo || t('no')}\n`;
      csv += `Note;${spec.g?.statement?.replace(/\n/g, " ") || ''}\n`;

      csv += "\nh) LOGISTICA\n";
      csv += `EAN / ITF / Tipo;${spec.log?.uvc?.ean || ''};${spec.log?.box?.itf || ''};${spec.log?.pallet?.tipo || ''}\n`;
      csv += `Dimensioni (LxPxH) cm;${spec.log?.uvc?.l || ''}x${spec.log?.uvc?.p || ''}x${spec.log?.uvc?.h || ''};${spec.log?.box?.l || ''}x${spec.log?.box?.p || ''}x${spec.log?.box?.h || ''};H Tot: ${spec.log?.pallet?.alt || ''}\n`;
      csv += `Peso Netto/Sgocc. (g);${spec.log?.uvc?.pesoNetto || ''} / ${spec.log?.uvc?.pesoSgocc || ''};--;--\n`;
      csv += `Tara / Lordo;${spec.log?.uvc?.tara || ''} / ${spec.log?.uvc?.pesoLordo || ''};${spec.log?.box?.tara || ''} / ${spec.log?.box?.pesoLordo || ''};Lordo Tot: ${spec.log?.pallet?.pesoTot || ''}\n`;
      csv += `Composizione / Pz;--;${spec.log?.box?.pz || ''};Crt/Str: ${spec.log?.pallet?.cLayer || ''} | Strati: ${spec.log?.pallet?.layers || ''} | Tot Crt: ${spec.log?.pallet?.totC || ''}\n`;

      csv += "\n\n========================================\n\n";
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Catalogo_Specifiche_Pivot.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePDF = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    
    const pdfPlace = qualData.pdfPlace || '_________________';
    const pdfDateStr = qualData.pdfDate ? new Date(qualData.pdfDate).toLocaleDateString(lang) : '_________________';
    
    const impegniTesti = globalConfig.impegniA || [];
    const logisticaList = globalConfig.impegniB || [];

    win.document.write(`
      <html>
        <head>
          <title>Dossier Qualifica - ${qualData.anagrafica?.rs || currentSupplier?.name || 'Fornitore'}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 0; color: #1e293b; font-size: 10px; line-height: 1.5; }
            .section { margin-bottom: 20px; page-break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
            .title { background: #f1f5f9; padding: 8px 12px; font-weight: 900; border-bottom: 1px solid #cbd5e1; text-transform: uppercase; font-size: 11px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; word-wrap: break-word; vertical-align: middle; }
            th { background-color: #f8fafc; font-weight: bold; color: #475569; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; }
            .section table { border: none; margin-bottom: 0; }
            .section th, .section td { border-left: none; border-right: none; }
            .section tr:last-child td, .section tr:last-child th { border-bottom: none; }
            .label { font-weight: bold; background-color: #f8fafc; width: 30%; color: #334155; }
            .sign-container { margin-top: 60px; display: flex; justify-content: space-between; text-align: center; page-break-inside: avoid; gap: 20px; }
            .sign-box { border-top: 1px solid #0f172a; flex: 1; padding-top: 8px; font-weight: bold; font-size: 10px; color: #0f172a; }
          </style>
        </head>
        <body>
          <table style="width: 100%; border-bottom: 3px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; border-collapse: collapse;">
            <tr>
              <td style="width: 40%; text-align: left; vertical-align: top; border: none; padding: 0;">
                ${masterLogo ? `<img src="${masterLogo}" style="max-height: 70px; object-fit: contain;" />` : ''}
              </td>
              <td style="width: 60%; text-align: right; vertical-align: top; font-size: 10px; line-height: 1.5; border: none; padding: 0; color: #475569;">
                <strong style="font-size: 13px; text-transform: uppercase; color: #0f172a;">International Food Pivot Srl</strong><br>
                Sede legale ed operativa<br>
                Piazza Duca Dâ€™Aosta, 12<br>
                20124 Milano â€“ Italia<br>
                Partita IVA 11514530960<br>
                ordini@italianfoodpivot.it<br>
                amministrazione@italianfoodpivot.it<br>
                PEC: internationalfoodpivot@legalmail.it<br>
                Codice SDI SUBM70N<br>
                Tel. +39 02 82197510
              </td>
            </tr>
          </table>
          <h2 style="text-align:center; font-size: 16px; margin-top:0; margin-bottom: 20px; text-transform: uppercase;">${t('pdfReportTitle')}</h2>
          
          <div class="section">
            <div class="title">${t('sect1')}</div>
            <table>
              <tr>
                <td class="label">${t('rs')}</td><td colspan="3"><b>${qualData.anagrafica?.rs || currentSupplier?.name || ''}</b></td>
              </tr>
              <tr>
                <td class="label">${t('piva')}</td><td>${qualData.anagrafica?.piva || ''}</td>
                <td class="label">${t('nazione')}</td><td>${qualData.anagrafica?.nazione || ''}</td>
              </tr>
              <tr>
                <td class="label">${t('sede')}</td><td colspan="3">${qualData.anagrafica?.sede || ''}, ${qualData.anagrafica?.cap || ''} ${qualData.anagrafica?.citta || ''} (${qualData.anagrafica?.provincia || ''})</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <div class="title">${t('sect2')}</div>
            <table>
              <tr><th>${t('dept')}</th><th>${t('name')}</th><th>${t('email')}</th><th>${t('tel')}</th></tr>
              ${Object.entries(qualData.contatti || {}).map(([dept, data]) => `
                <tr>
                  <td style="text-transform: uppercase;"><b>${dept}</b></td>
                  <td>${data?.nome || '-'}</td>
                  <td>${data?.email || '-'}</td>
                  <td>${data?.tel || '-'}</td>
                </tr>
              `).join('')}
            </table>
          </div>

          <div class="section">
            <div class="title">${t('sect3')}</div>
            <table>
              <tr><th>${t('certType')}</th><th>${t('expDate')}</th><th>${t('attState')}</th></tr>
              ${(qualData.certificazioni || []).map(c => `
                <tr>
                  <td><b>${c.type || '-'}</b></td>
                  <td>${c.expiry ? new Date(c.expiry).toLocaleDateString(lang) : t('notDef')}</td>
                  <td>${c.fileName ? t('loaded') : t('missing')}</td>
                </tr>
              `).join('')}
            </table>
          </div>

          <div class="section">
            <div class="title">${t('sect4')}</div>
            <table>
              <tr><th style="width:85%">${t('decl')}</th><th style="width:15%; text-align:center;">${t('outcome')}</th></tr>
              ${impegniTesti.map((imp, idx) => {
                const isChecked = Array.isArray(qualData.fileA?.impegni) ? (qualData.fileA.impegni[idx] || false) : false;
                const textStr = typeof imp === 'string' ? imp : (imp?.[lang] || imp?.it || '');
                return `
                <tr>
                  <td style="text-align: justify; padding: 10px;">${textStr}</td>
                  <td style="text-align: center; font-weight: bold; vertical-align: middle; ${isChecked ? 'color: #059669;' : 'color: #dc2626;'}">
                    ${isChecked ? t('yesAccept') : t('noAccept')}
                  </td>
                </tr>
                `;
              }).join('')}
            </table>
          </div>

          <div class="section">
            <div class="title">${t('sect5')}</div>
            <table>
              <tr><th style="width:85%">${t('ctrlParam')}</th><th style="width:15%; text-align:center;">${t('outcome')}</th></tr>
              ${logisticaList.map(imp => {
                const isChecked = qualData.fileB?.[imp?.id] || false;
                const titleStr = imp?.[`title_${lang}`] || imp?.title_it || imp?.title || '';
                const descStr = imp?.[`desc_${lang}`] || imp?.desc_it || imp?.desc || '';
                return `
                <tr>
                  <td style="padding: 10px;">
                    <b style="font-size: 11px;">${titleStr}</b><br/>
                    <span style="font-size: 9px; text-align: justify; display: block; margin-top: 4px;">${descStr}</span>
                  </td>
                  <td style="text-align: center; font-weight: bold; vertical-align: middle; ${isChecked ? 'color: #059669;' : 'color: #dc2626;' }">
                    ${isChecked ? t('yesConf') : t('noConf')}
                  </td>
                </tr>
                `;
              }).join('')}
            </table>
          </div>

          <div class="section">
            <div class="title">${t('sect6')}</div>
            <table>
              <tr><th style="width: 35%;">${t('allergen')}</th><th style="width: 25%;">${t('presImp')}</th><th style="width: 40%;">${t('gestPrev')}</th></tr>
              ${(globalConfig.allergeni || []).map((all, i) => {
                const presenceRaw = typeof qualData.fileA?.allergeniPresence?.[i] === 'boolean' ? (qualData.fileA.allergeniPresence[i] ? 'Presente' : 'Assente') : (qualData.fileA?.allergeniPresence?.[i] || 'Assente');
                const gestione = qualData.fileA?.allergeniGestione?.[i] || '';
                const note = qualData.fileA?.allergeniNotes?.[i] || '';
                const detail = [gestione, note].filter(Boolean).join(' - ');
                return `
                  <tr>
                    <td><b>${all?.[lang] || all?.it || ''}</b></td>
                    <td>${presenceRaw}</td>
                    <td>${detail || '-'}</td>
                  </tr>
                `;
              }).join('')}
            </table>
          </div>

          <div class="section">
            <div class="title">${t('sect7')}</div>
            <table>
              <tr><th>${t('typology')}</th><th>${t('prodName')}</th><th>${t('labelOrigine')}</th><th>${t('labelTmc')}</th></tr>
              ${(qualData.fileC || []).length > 0 ? (qualData.fileC || []).map(p => `
                <tr>
                  <td>${p?.tipologia || '-'}</td>
                  <td>${p?.denominazione || '-'}</td>
                  <td>${p?.origine || '-'}</td>
                  <td>${p?.shelfLife || '-'}</td>
                </tr>
              `).join('') : `<tr><td colspan="4" style="text-align:center;">-</td></tr>`}
            </table>
          </div>

          <div class="sign-container">
            <div class="sign-box">
              ${t('placeAndDate')}<br><br><br>
              ${pdfPlace}, ${pdfDateStr}
            </div>
            <div class="sign-box">
              ${t('suppStamp')}<br>
              <span style="font-weight: normal; font-size: 9px; color: #475569;">${t('suppRole')}</span><br><br><br>
              ................................................
            </div>
            <div class="sign-box">
              ${t('pivotStamp')}<br>
              <span style="font-weight: normal; font-size: 9px; color: #475569;">${t('pivotRole')}</span><br><br><br>
              ................................................
            </div>
          </div>

          <script>
            setTimeout(() => { window.print(); }, 800);
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const generateSpecPDF = (spec, pdfType = 'standard') => {
    const win = window.open('', '_blank');
    if (!win) return;

    const pdfPlace = qualData.pdfPlace || '_________________';
    const pdfDateStr = qualData.pdfDate ? new Date(qualData.pdfDate).toLocaleDateString(lang) : '_________________';

    const imagesToRender = [...(spec.photos || []), ...(spec.attachedSheets || [])].filter(f => f.data && f.data.startsWith('data:image'));
    let visualAttachmentsHtml = '';
    if (imagesToRender.length > 0) {
      visualAttachmentsHtml = `
        <div style="page-break-before: always;"></div>
        <div class="section">
          <div class="title">ALLEGATI VISIVI (FOTO PRODOTTO ED ETICHETTE)</div>
          <div style="padding: 20px; text-align: center;">
            ${imagesToRender.map(img => `
              <div style="margin-bottom: 40px; page-break-inside: avoid;">
                <strong style="display:block; margin-bottom: 10px; font-size: 13px; color: #0f172a;">${img.name}</strong>
                <img src="${img.data}" style="max-width: 100%; max-height: 800px; object-fit: contain; border: 2px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #f8fafc;" />
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    win.document.write(`
      <html>
        <head>
          <title>Specifica Tecnica - ${spec.master?.nome || 'Prodotto'}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 0; color: #1e293b; font-size: 10px; line-height: 1.5; }
            .section { margin-bottom: 20px; page-break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
            .title { background: #f1f5f9; padding: 8px 12px; font-weight: 900; border-bottom: 1px solid #cbd5e1; text-transform: uppercase; font-size: 11px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; word-wrap: break-word; vertical-align: middle; }
            th { background-color: #f8fafc; font-weight: bold; color: #475569; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; }
            .section table { border: none; margin-bottom: 0; }
            .section th, .section td { border-left: none; border-right: none; }
            .section tr:last-child td, .section tr:last-child th { border-bottom: none; }
            .label { font-weight: bold; background-color: #f8fafc; width: 35%; color: #334155; }
            .sign-container { margin-top: 60px; display: flex; justify-content: space-between; text-align: center; page-break-inside: avoid; gap: 20px; }
            .sign-box { border-top: 1px solid #0f172a; flex: 1; padding-top: 8px; font-weight: bold; font-size: 10px; color: #0f172a; }
          </style>
        </head>
        <body>
          <table style="width: 100%; border-bottom: 3px solid #0f172a; padding-bottom: 15px; margin-bottom: 25px; border-collapse: collapse;">
            <tr>
              <td style="width: 30%; text-align: left; vertical-align: top; border: none; padding: 0;">
                ${masterLogo ? `<img src="${masterLogo}" style="max-height: 70px; object-fit: contain;" />` : ''}
              </td>
              <td style="width: 40%; text-align: center; vertical-align: top; font-size: 10px; line-height: 1.5; border: none; padding: 0; color: #475569;">
                <strong style="font-size: 13px; text-transform: uppercase; color: #0f172a;">International Food Pivot Srl</strong><br>
                Sede legale ed operativa<br>
                Piazza Duca Dâ€™Aosta, 12<br>
                20124 Milano â€“ Italia<br>
                Partita IVA 11514530960<br>
                ordini@italianfoodpivot.it<br>
                amministrazione@italianfoodpivot.it<br>
                PEC: internationalfoodpivot@legalmail.it<br>
                Codice SDI SUBM70N<br>
                Tel. +39 02 82197510
              </td>
              <td style="width: 30%; text-align: right; vertical-align: bottom; border: none; padding: 0;">
                ${spec.a?.brandLogo ? `<img src="${spec.a.brandLogo}" style="max-height: 70px; object-fit: contain;" />` : ''}
              </td>
            </tr>
          </table>

          <div style="text-align: center; margin-bottom: 15px; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <h2 style="margin:0 0 5px 0; color: #0f172a;">${t('ap05_title')}</h2>
            <p style="margin:0; color: #64748b; font-weight: bold;">Stato: ${spec.isObsolete ? t('statusArchived') : 'ATTIVA'} | ${t('rev')}: ${spec.header?.revision || '0'} | Data: ${spec.saveDate || 'Bozza'}</p>
          </div>
          
          <table style="margin-bottom: 20px;">
            <tr>
              <td class="label">${t('prodCode')}</td><td><b>${spec.master?.codice || ''}</b></td>
              <td class="label">${t('prodName')}</td><td><b style="font-size: 12px;">${spec.master?.nome || ''}</b></td>
            </tr>
            <tr>
              <td class="label">${t('eanCode')}</td><td>${spec.header?.ean || ''}</td>
              <td class="label">${t('uvcWeight')}</td><td>${spec.header?.uvcWeight || ''}</td>
            </tr>
          </table>

          <div class="section">
            <div class="title">${t('sc_a')}</div>
            <table>
              <tr><td class="label">${t('legalName')}</td><td>${spec.a?.legalName || ''}</td></tr>
              <tr><td class="label">${t('brand')}</td><td>${spec.a?.brand || ''}</td></tr>
              <tr><td class="label">${t('claim')}</td><td>${spec.a?.claim || ''}</td></tr>
              <tr><td class="label">${t('ingredients')}</td><td>${spec.a?.ingredients || ''}</td></tr>
              ${pdfType === 'standard' ? `
                <tr><td class="label">${t('tmc')} / ${t('tmcFormat')}</td><td>${spec.a?.tmc || ''} / ${spec.a?.tmcFormat || ''}</td></tr>
              ` : ''}
              ${pdfType === 'ifp' ? `
                <tr><td class="label">${t('ggConsegna')}</td><td>${spec.a?.giorniGarantiti || ''}</td></tr>
              ` : ''}
              <tr><td class="label">${t('supplier')} / ${t('producedIn')}</td><td>${spec.a?.supplier || ''} / ${spec.a?.producedIn || ''}</td></tr>
              <tr><td class="label">${t('packaging')}</td><td>${spec.a?.packaging || ''}</td></tr>
              <tr><td class="label">${t('batchFormat')}</td><td>${spec.a?.batchFormat || ''}</td></tr>
              <tr><td class="label">${t('batchDecode')}</td><td>${spec.a?.batchDecode?.replace(/\n/g, "<br>") || ''}</td></tr>
              <tr><td class="label">${t('prepMode')}</td><td>${spec.a?.prepMode || ''}</td></tr>
              <tr><td class="label">${t('intendedUse')}</td><td>${spec.a?.intendedUse || ''}</td></tr>
              <tr><td class="label">${t('storage')}</td><td>${spec.a?.storage || ''}</td></tr>
              <tr><td class="label">${t('processDesc')}</td><td>${spec.a?.processDesc?.replace(/\n/g, "<br>") || ''}</td></tr>
              <tr><td class="label">${t('envLabel')}</td><td>${spec.a?.envLabel?.replace(/\n/g, "<br>") || ''}</td></tr>
              <tr><td class="label">${t('packMode')}</td><td>${spec.a?.packMode || ''}</td></tr>
            </table>
          </div>

          <div class="section">
            <div class="title">${t('sc_b')}</div>
            <table>
              <tr><th style="width: 30%;">${t('param')}</th><th style="width: 25%;">${t('limite')}</th><th style="width: 25%;">${t('risultato')}</th><th style="width: 20%;">${t('conforme')}</th></tr>
              ${(spec.b || []).filter(r=>r.p).map(r => `<tr><td><b>${r.p || ''}</b></td><td>${r.limite || ''}</td><td>${r.risultato || ''}</td><td>${r.conforme || ''}</td></tr>`).join('')}
            </table>
          </div>

          <div class="section">
            <div class="title">${t('sc_c')}</div>
            <table>
              <tr><th style="width: 50%;">${t('element')}</th><th style="width: 50%;">${t('value')}</th></tr>
              ${(spec.c || []).filter(r=>r.p||r.v).map(r => `<tr><td><b>${r.p || ''}</b></td><td>${r.v || ''}</td></tr>`).join('')}
            </table>
          </div>

          <div class="section">
            <div class="title">${t('sc_d')}</div>
            <table>
              <tr><th style="width: 30%;">${t('param')}</th><th style="width: 25%;">${t('limite')}</th><th style="width: 25%;">${t('risultato')}</th><th style="width: 20%;">${t('conforme')}</th></tr>
              ${(spec.d || []).filter(r=>r.p).map(r => `<tr><td><b>${r.p || ''}</b></td><td>${r.limite || ''}</td><td>${r.risultato || ''}</td><td>${r.conforme || ''}</td></tr>`).join('')}
            </table>
          </div>

          <div class="section">
            <div class="title">${t('sc_e')}</div>
            <table>
              <tr><td class="label">${t('consistency')}</td><td>${spec.e?.consistency || ''}</td></tr>
              <tr><td class="label">${t('aroma')}</td><td>${spec.e?.aroma || ''}</td></tr>
              <tr><td class="label">${t('look')}</td><td>${spec.e?.look || ''}</td></tr>
              <tr><td class="label">${t('taste')}</td><td>${spec.e?.taste || ''}</td></tr>
            </table>
          </div>

          <div class="section">
            <div class="title">${t('sc_f')}</div>
            <table>
              <tr><th style="width:40%">${t('allergen')}</th><th style="width:15%">${t('presence')}</th><th style="width:20%">${t('traces')}</th><th style="width:25%">Note</th></tr>
              ${(spec.f || []).map(r => {
                const allergenName = r.it || ((globalConfig.allergeni || []).find(a => a.id === r.id) || {})[lang] || r.it || '';
                return `<tr><td><b>${allergenName}</b></td><td>${r.presenza || ''}</td><td>${r.tracce || ''}</td><td>${r.note || ''}</td></tr>`;
              }).join('')}
            </table>
          </div>

          <div class="section">
            <div class="title">${t('sc_g')}</div>
            <table>
              <tr><td class="label">${t('containsGmo')}</td><td><b>${spec.g?.containsGmo || t('no')}</b></td></tr>
              <tr><td class="label">Note OGM</td><td>${spec.g?.statement || ''}</td></tr>
            </table>
          </div>

          <div class="section">
            <div class="title">${t('sc_h')}</div>
            <table>
              <tr><th style="width: 25%;">${t('logParam')}</th><th style="width: 25%;">${t('logUvc')}</th><th style="width: 25%;">${t('logCarton')}</th><th style="width: 25%;">${t('logPallet')}</th></tr>
              <tr>
                <td class="label">${t('eanItfType')}</td>
                <td>${spec.log?.uvc?.ean || '-'}</td>
                <td>${spec.log?.box?.itf || '-'}</td>
                <td>${spec.log?.pallet?.tipo || '-'}</td>
              </tr>
              <tr>
                <td class="label">${t('dims')}</td>
                <td>${spec.log?.uvc?.l||'-'} x ${spec.log?.uvc?.p||'-'} x ${spec.log?.uvc?.h||'-'}</td>
                <td>${spec.log?.box?.l||'-'} x ${spec.log?.box?.p||'-'} x ${spec.log?.box?.h||'-'}</td>
                <td>H Tot: ${spec.log?.pallet?.alt || '-'}</td>
              </tr>
              <tr>
                <td class="label">${t('netDrain')}</td>
                <td>${spec.log?.uvc?.pesoNetto || '-'} / ${spec.log?.uvc?.pesoSgocc || '-'}</td>
                <td>-</td>
                <td>-</td>
              </tr>
              <tr>
                <td class="label">${t('tareGross')}</td>
                <td>${spec.log?.uvc?.tara || '-'} / ${spec.log?.uvc?.pesoLordo || '-'}</td>
                <td>${spec.log?.box?.tara || '-'} / ${spec.log?.box?.pesoLordo || '-'}</td>
                <td>Tot Lordo: ${spec.log?.pallet?.pesoTot || '-'}</td>
              </tr>
              <tr>
                <td class="label">${t('composition')}</td>
                <td>-</td>
                <td>Pz x Cart: ${spec.log?.box?.pz || '-'}</td>
                <td>Crt/Str: ${spec.log?.pallet?.cLayer || '-'} | Strati: ${spec.log?.pallet?.layers || '-'} | Tot Crt: ${spec.log?.pallet?.totC || '-'}</td>
              </tr>
            </table>
          </div>

          <div class="sign-container">
            <div class="sign-box">
              ${t('placeAndDate')}<br><br><br>
              ${pdfPlace}, ${pdfDateStr}
            </div>
            <div class="sign-box">
              ${t('suppStamp')}<br>
              <span style="font-weight: normal; font-size: 9px; color: #475569;">${t('suppRole')}</span><br><br><br>
              ................................................
            </div>
            <div class="sign-box">
              ${t('pivotStamp')}<br>
              <span style="font-weight: normal; font-size: 9px; color: #475569;">${t('pivotRole')}</span><br><br><br>
              ................................................
            </div>
          </div>

          ${visualAttachmentsHtml}

          <script>
            setTimeout(() => { window.print(); }, 800);
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  // --- RENDERS ---
  return (
    <>
      {/* OVERLAY ELABORAZIONE INTELLIGENZA ARTIFICIALE / CONVERSIONE PDF */}
      {isExtracting && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
          <div className="bg-white rounded-[3rem] p-12 max-w-sm w-full shadow-2xl flex flex-col items-center justify-center text-center animate-in zoom-in duration-300 border-4 border-blue-100">
            <div className="relative mb-8">
              <Loader2 className="animate-spin text-blue-600" size={80} strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tighter">Caricamento...</h3>
            <p className="text-sm font-bold text-slate-500 leading-relaxed">
              Il sistema sta elaborando e convertendo il documento...
            </p>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {historyModal.isOpen && historyModal.spec && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-3xl w-full shadow-2xl animate-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
               <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3"><History className="text-blue-600"/> {t('historyTitle')}: {historyModal.spec.master.nome || 'Prodotto'}</h3>
               <button onClick={() => setHistoryModal({isOpen: false, spec: null})} className="text-slate-400 hover:text-slate-900 bg-slate-100 p-2 rounded-full transition-colors"><X size={20}/></button>
             </div>
             
             <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {productSpecs.filter(s => 
                   (s.familyId && s.familyId === historyModal.spec.familyId) || 
                   (!s.familyId && s.master?.codice && s.master.codice === historyModal.spec.master?.codice) ||
                   (!s.familyId && !s.master?.codice && s.master?.nome === historyModal.spec.master?.nome)
                ).sort((a, b) => b.header.revision - a.header.revision).map(hSpec => (
                   <div key={hSpec.id} className="flex flex-col p-5 border rounded-2xl bg-slate-50 hover:bg-white hover:shadow-md transition-all gap-4">
                      <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-6">
                          <div className="bg-slate-200 w-12 h-12 rounded-full flex items-center justify-center font-black text-slate-500">
                            {hSpec.header.revision || 0}
                          </div>
                          <div>
                             <span className="font-black text-sm uppercase text-slate-800 block">Revisione {hSpec.header.revision || 0}</span>
                             <span className="text-xs font-bold text-slate-500 block mt-1 flex items-center gap-1">
                               <Calendar size={12}/> Data salvataggio: {hSpec.saveDate || 'N/D'}
                             </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${hSpec.isObsolete ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                             {hSpec.isObsolete ? t('statusArchived') : 'ATTIVA'}
                           </span>
                           <button onClick={() => generateSpecPDF(hSpec)} className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition flex items-center gap-2 text-xs font-black uppercase">
                             <FileDown size={16}/> {t('exportPdf')}
                           </button>
                        </div>
                      </div>
                      
                      {/* File salvati per questa specifica revisione */}
                      {((hSpec.attachedSheets && hSpec.attachedSheets.length > 0) || (hSpec.photos && hSpec.photos.length > 0)) && (
                        <div className="pt-3 border-t border-slate-200">
                           <span className="text-[10px] font-black text-slate-500 uppercase block mb-3">{t('attachedFiles')}</span>
                           <div className="flex flex-wrap gap-2">
                              {(hSpec.attachedSheets || []).map((file, idx) => (
                                <a key={`h-sheet-${idx}`} href={file.data} download={file.name} className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors group shadow-sm" title="Scarica Documento">
                                   <FileText size={14} className="text-blue-500" />
                                   <span className="text-[10px] font-bold text-slate-600 truncate max-w-[200px] group-hover:text-blue-700">{file.name}</span>
                                   <Download size={12} className="text-slate-400 group-hover:text-blue-600 ml-1" />
                                </a>
                              ))}
                              {(hSpec.photos || []).map((file, idx) => (
                                <a key={`h-photo-${idx}`} href={file.data} download={file.name} className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors group shadow-sm" title="Scarica Immagine/Etichetta">
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
      )}

      {/* MODAL GLOBALE PER EVITARE ALERT() E PROMPT() NATIVI BLOCCATI DAGLI IFRAME */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-200 text-slate-900">
            <h3 className="text-xl font-black text-slate-900 mb-6 whitespace-pre-line">{modal.message}</h3>
            {modal.showInput && (
              <input 
                type="password" 
                className="w-full p-4 rounded-xl bg-slate-50 border-2 border-slate-200 focus:border-blue-500 outline-none mb-6 font-mono text-center text-xl text-slate-900"
                autoFocus
                value={modal.inputValue}
                onChange={(e) => setModal({...modal, inputValue: e.target.value})}
                onKeyDown={(e) => { if (e.key === 'Enter') modal.onConfirm(modal.inputValue); }}
              />
            )}
            <div className="flex gap-4 justify-end">
              {(modal.type === 'confirm' || modal.type === 'prompt') && (
                <button onClick={modal.onCancel} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors uppercase text-xs tracking-widest">Annulla</button>
              )}
              <button onClick={() => modal.onConfirm(modal.inputValue)} className="px-8 py-3 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg uppercase text-xs tracking-widest">OK</button>
            </div>
          </div>
        </div>
      )}

      {view !== 'admin' && <GlobalTools lang={lang} setLang={setLang} t={t} />}
      
      {view === 'home' && (
        <div className="min-h-screen bg-[#eef0f4] px-6 pt-10 pb-20 font-sans text-[#12182b]">
          {/* BADGE STATO WORKSPACE */}
          <div className="max-w-[1300px] mx-auto mb-[30px]">
            <span className="inline-flex items-center gap-2 border border-[#e4e6ec] bg-white rounded-[20px] px-3.5 py-1.5 text-xs font-bold tracking-[0.04em] text-[#1c2233]">
              {user ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#2ecc71]"></span>
                  WORKSPACE CONDIVISO ATTIVO
                </>
              ) : (
                <><CloudOff size={14} className="text-red-400"/> OFFLINE</>
              )}
            </span>
          </div>

          {/* HERO */}
          <header className="text-center max-w-[1000px] mx-auto mb-10">
            <h1 className="text-[56px] font-black tracking-[-0.5px] mb-3 uppercase leading-none">{t('title')}</h1>
            <p className="italic font-bold tracking-[0.02em] text-[#7d8492] text-[17px] uppercase">{t('subtitle')}</p>
          </header>

          {/* LOGO CARD */}
          <div className="max-w-[500px] mx-auto mb-[50px] bg-white rounded-[20px] p-7 shadow-[0_1px_3px_rgba(20,20,40,0.05)]">
            <div className="flex items-center gap-2 text-[13px] font-extrabold tracking-[0.03em] mb-[18px]">
              <ImageIcon size={18} className="text-[#4f7cff]" />
              <span>Official Logo Setup</span>
            </div>
            <div className="relative border-2 border-dashed border-[#d6dae3] rounded-[14px] px-5 pt-8 pb-[22px] flex flex-col items-center gap-3.5 cursor-pointer hover:bg-[#fafbfd] transition-colors">
              <div className="absolute top-[14px] right-[14px] flex gap-2">
                <a href={masterLogo || undefined} download={masterLogo ? "master_logo" : undefined} onClick={(e) => e.stopPropagation()} className="w-[34px] h-[34px] rounded-full border border-[#e4e6ec] bg-white flex items-center justify-center text-[#7d8492] hover:text-[#1fa971] transition-colors" title="Scarica Logo">
                  <Download size={16} />
                </a>
                <button onClick={handleMasterLogoDelete} className="w-[34px] h-[34px] rounded-full border border-[#e4e6ec] bg-white flex items-center justify-center text-[#7d8492] hover:text-[#e03a2c] transition-colors" title="Elimina Logo">
                  <Trash2 size={16} />
                </button>
              </div>
              {masterLogo ? (
                <div className="w-24 h-24 rounded-full bg-white border border-[#eee] flex items-center justify-center overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                  <img src={masterLogo} className="w-full h-full object-cover rounded-full" alt="Logo" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-white border border-[#eee] flex items-center justify-center overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                  <svg width="70" height="70" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="48" fill="#2b1810" />
                    <text x="50" y="58" fontSize="30" fill="#d4a94a" textAnchor="middle" fontFamily="serif">FP</text>
                  </svg>
                </div>
              )}
              <span className="text-[11px] font-extrabold tracking-[0.06em] text-[#9aa0ab]">Imposta Logo Ufficiale</span>
              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleMasterLogoUpload} />
            </div>
          </div>

          {/* CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[26px] max-w-[1300px] mx-auto">
            {[
              { id: 'admin', icon: ShieldCheck, tileBg: 'bg-[#dce6fd]', tileIc: 'text-[#2f5be0]', title: t('admin'), desc: t('adminDesc') },
              { id: 'qual', icon: Users, tileBg: 'bg-[#d7f3e6]', tileIc: 'text-[#1fa971]', title: t('qualify'), desc: t('qualifyDesc') },
              { id: 'tech', icon: FileText, tileBg: 'bg-[#fdecc8]', tileIc: 'text-[#e0982c]', title: t('tech'), desc: t('techDesc') }
            ].map((card) => (
              <div key={card.id} className="bg-white rounded-[22px] px-8 pt-[34px] pb-8 flex flex-col min-h-[340px] shadow-[0_1px_3px_rgba(20,20,40,0.05)]">
                <div className={`w-16 h-16 rounded-[16px] flex items-center justify-center mb-[26px] ${card.tileBg} ${card.tileIc}`}><card.icon size={30} strokeWidth={2} /></div>
                <h2 className="text-[26px] font-black mb-2.5 uppercase leading-none">{card.title}</h2>
                <p className="text-[#8a8f9c] text-[15px] leading-[1.4] flex-1 font-medium">{card.desc}</p>
                <button onClick={() => setView(card.id === 'admin' ? 'admin' : `login_${card.id}`)} className="mt-6 bg-[#12182b] text-white rounded-[12px] px-5 py-4 text-sm font-extrabold tracking-[0.08em] flex items-center justify-center gap-2 cursor-pointer hover:opacity-85 transition-opacity uppercase">
                  {t('access')} <ChevronRight size={14} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {view.startsWith('login_') && (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans text-slate-900">
          <div className="max-w-md w-full bg-white p-14 rounded-[3.5rem] shadow-2xl relative text-slate-900">
            <button onClick={goHome} className="absolute top-8 left-8 text-slate-300 hover:text-slate-900 transition-colors"><ArrowLeft /></button>
            <h2 className="text-4xl font-black text-center uppercase tracking-tighter mb-12 leading-none text-slate-900">{t('loginTitle')}</h2>
            <div className="space-y-8 text-slate-900">
              <input type="text" value={inputPass} onChange={(e) => setInputPass(e.target.value)} className="w-full bg-slate-50 border-4 border-slate-50 p-6 rounded-3xl outline-none focus:border-slate-900 text-center font-mono text-2xl uppercase tracking-widest shadow-inner text-slate-900" placeholder={t('passwordPlaceholder')} />
              <button onClick={() => handleLogin(view.split('_')[1])} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest shadow-xl transition active:scale-95">{t('access')}</button>
            </div>
          </div>
        </div>
      )}

      {view === 'supplier_tech' && (
        <div className="min-h-screen bg-slate-100 font-sans pb-20 text-slate-900">
          {/* BANNER TEMPLATE GLOBALE (VISIBILE SOLO A 'TEST' O 'DEMO') */}
          {isTestUser && (
            <div className="bg-amber-400 text-amber-900 font-black text-xs uppercase px-10 py-3 flex justify-between items-center sticky top-0 z-50">
              <span>ModalitÃ  Template: Modifica i testi per tutti i fornitori</span>
              <button onClick={saveGlobalTemplates} className="bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2"><Save size={14}/> Salva Modifiche Globali</button>
            </div>
          )}

          <nav className="bg-white border-b sticky top-0 z-30 px-10 py-6 flex justify-between items-center shadow-lg text-slate-900">
            <div className="flex items-center gap-6 text-slate-900"><FileText size={32} className="text-amber-500" /><h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{t('ap05_title')}</h2></div>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end mr-2">
                <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  {t('connected')}
                </span>
                {lastSyncTime && <span className="text-[9px] font-bold text-slate-400 mt-0.5">{t('lastSync')} {lastSyncTime}</span>}
              </div>
              <button onClick={saveProgress} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-2 text-white"><UploadCloud size={16}/> {t('save')}</button>
              <button onClick={goHome} className="bg-slate-100 p-4 rounded-2xl text-slate-500 hover:text-slate-900 transition-all shadow-sm"><ArrowLeft size={24}/></button>
            </div>
          </nav>

          <div className="max-w-7xl mx-auto p-12 space-y-12">
            
            {/* NUOVO BLOCCO: LETTERA IMPEGNO SCHEDE TECNICHE */}
            <div className="bg-white rounded-[3rem] shadow-xl border border-slate-200 p-10 mb-12">
              <div className="flex items-center gap-6 mb-8">
                <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl"><FileSignature size={32}/></div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">{t('impegnoTitle')}</h3>
                  <p className="text-sm font-bold text-slate-500">{t('impegnoDesc')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4">1. Genera Documento</h4>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <input 
                      className="w-full p-3 rounded-xl border border-slate-200 shadow-sm font-bold text-sm outline-none focus:ring-2 ring-blue-500" 
                      placeholder={t('pdfPlaceLabel')} 
                      value={qualData.impegnoSchede?.place || ''} 
                      onChange={(e) => setQualData(p => ({...p, impegnoSchede: {...(p.impegnoSchede || {}), place: e.target.value}}))} 
                    />
                    <input 
                      type="date" 
                      className="w-full p-3 rounded-xl border border-slate-200 shadow-sm font-bold text-sm outline-none focus:ring-2 ring-blue-500" 
                      value={qualData.impegnoSchede?.date || ''} 
                      onChange={(e) => setQualData(p => ({...p, impegnoSchede: {...(p.impegnoSchede || {}), date: e.target.value}}))} 
                    />
                  </div>
                  <button onClick={generateImpegnoPDF} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase text-xs hover:bg-slate-700 transition-colors shadow-lg flex items-center justify-center gap-2">
                    <Printer size={16}/> {t('downloadImpegno')}
                  </button>
                </div>

                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 flex flex-col justify-center items-center text-center">
                   <h4 className="text-[10px] font-black uppercase text-slate-500 mb-4 w-full text-left">2. Carica Documento Firmato</h4>
                   {qualData.impegnoSchede?.fileData ? (
                     <div className="w-full">
                       <div className="bg-emerald-100 text-emerald-700 p-4 rounded-2xl flex items-center justify-between border border-emerald-300 mb-4">
                         <div className="flex items-center gap-3 overflow-hidden">
                           <CheckCircle2 size={24} className="shrink-0"/>
                           <span className="font-bold text-sm truncate">{qualData.impegnoSchede.fileName}</span>
                         </div>
                       </div>
                       <div className="flex gap-4">
                         <a href={qualData.impegnoSchede.fileData} download={qualData.impegnoSchede.fileName} className="flex-1 bg-white text-emerald-700 py-3 rounded-xl font-black uppercase text-xs hover:bg-emerald-50 transition-colors shadow border border-emerald-200 flex items-center justify-center gap-2">
                           <Download size={16}/> Scarica
                         </a>
                         <button onClick={deleteImpegnoFile} className="flex-1 bg-white text-red-600 py-3 rounded-xl font-black uppercase text-xs hover:bg-red-50 transition-colors shadow border border-red-200 flex items-center justify-center gap-2">
                           <Trash2 size={16}/> Rimuovi
                         </button>
                       </div>
                     </div>
                   ) : (
                     <div className="relative overflow-hidden inline-block w-full">
                        <button className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black uppercase text-sm hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center gap-2 pointer-events-none">
                          <UploadCloud size={24}/> {t('uploadImpegno')}
                        </button>
                        <input type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImpegnoUpload} />
                     </div>
                   )}
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-slate-900">
               <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900">{t('techDesc')}</h3>
               <div className="flex flex-wrap items-center gap-4">
                 {productSpecs.some(s => s.isObsolete) && (
                   <button onClick={() => setShowObsoleteSpecs(!showObsoleteSpecs)} className="bg-slate-200 text-slate-600 px-6 py-4 rounded-2xl font-black uppercase text-xs shadow-sm hover:bg-slate-300 transition-colors flex items-center gap-2">
                     {showObsoleteSpecs ? <EyeOff size={18}/> : <Eye size={18}/>} 
                     {showObsoleteSpecs ? t('hideObsolete') : t('showObsolete')}
                   </button>
                 )}
                 <button onClick={addTechSpec} className="bg-amber-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-amber-700 flex items-center gap-2"><PlusCircle size={20}/> {t('newSpec')}</button>
               </div>
            </div>

            <div className="space-y-8">
              {productSpecs.filter(spec => showObsoleteSpecs || !spec.isObsolete).map(spec => (
                <div key={spec.id} className={`bg-white rounded-[3rem] shadow-xl overflow-hidden border-2 transition-all ${spec.isObsolete ? 'border-red-500 opacity-60' : spec.isSaved ? 'border-emerald-500' : 'border-slate-200'}`}>
                  <div className="p-8 bg-slate-50 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors text-slate-900" onClick={() => setExpandedSpecId(expandedSpecId === spec.id ? null : spec.id)}>
                    <div className="flex items-center gap-6">
                      <div className={`p-4 rounded-2xl shadow-inner ${spec.isObsolete ? 'bg-red-100 text-red-600' : spec.isSaved ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}><ShoppingBag size={28}/></div>
                      <div className="text-slate-900">
                        <div className="flex items-center gap-4">
                          <h4 className="text-2xl font-black uppercase text-slate-900">{spec.master?.nome || t('newSpec')}</h4>
                          {spec.isObsolete && <span className="bg-red-500 text-white px-2 py-1 rounded text-[8px] font-black uppercase">{t('statusArchived')}</span>}
                          {spec.isSaved && !spec.isObsolete && <span className="bg-emerald-500 text-white px-2 py-1 rounded text-[8px] font-black uppercase flex items-center gap-1"><CheckCircle2 size={10}/> {t('statusRead')}</span>}
                        </div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">
                          {t('prodCode')}: {spec.master?.codice || "---"} | EAN: {spec.header?.ean || "---"} | {t('rev')}: {spec.header?.revision || 0} {spec.saveDate ? `| Data: ${spec.saveDate}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-slate-400">
                      <button onClick={(e)=>{e.stopPropagation(); deleteTechSpec(spec.id)}} className="p-2 hover:text-red-600 transition-colors"><Trash2 size={24}/></button>
                      {expandedSpecId === spec.id ? <ChevronUp size={32}/> : <ChevronDown size={32}/>}
                    </div>
                  </div>

                  {expandedSpecId === spec.id && (
                    <div className="p-10 space-y-12 animate-in slide-in-from-top duration-300 text-slate-900 text-slate-900">
                      
                      <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl shadow-lg mb-8">
                         <div className="flex flex-wrap gap-4">
                            {!spec.isSaved && (
                              <button onClick={()=>saveSpec(spec.id)} className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-600 transition-colors shadow-sm">
                                <Save size={16} /> {t('saveSpec')}
                              </button>
                            )}
                            {spec.isSaved && !spec.isObsolete && (
                              <>
                                <div className="relative group">
                                  <button onClick={()=> {
                                    showConfirm(t('confirmEditMsg'), () => toggleEditSpec(spec.id));
                                  }} className="flex items-center gap-2 bg-amber-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-amber-600 transition-colors shadow-sm">
                                    <Edit3 size={16} /> {t('editSpec')}
                                  </button>
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block w-48 p-3 bg-slate-800 text-white text-[10px] rounded-xl shadow-xl z-50 text-center pointer-events-none font-bold leading-tight normal-case before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-slate-800">
                                    {t('tooltipEdit')}
                                  </div>
                                </div>
                                <div className="relative group">
                                  <button onClick={()=> {
                                    showConfirm(t('confirmReviseMsg'), () => reviseSpec(spec.id));
                                  }} className="flex items-center gap-2 bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-colors shadow-sm">
                                    <FileClock size={16} /> {t('reviseSpec')} (Rev. {parseInt(spec.header?.revision || 0) + 1})
                                  </button>
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block w-52 p-3 bg-slate-800 text-white text-[10px] rounded-xl shadow-xl z-50 text-center pointer-events-none font-bold leading-tight normal-case before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-slate-800">
                                    {t('tooltipRevise')}
                                  </div>
                                </div>
                                <button onClick={() => setHistoryModal({isOpen: true, spec})} className="flex items-center gap-2 bg-slate-700 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-slate-600 transition-colors shadow-sm">
                                  <History size={16} /> {t('historyBtn')}
                                </button>
                              </>
                            )}
                         </div>
                         <div className="text-white text-xs font-black uppercase opacity-50 tracking-widest px-4 flex items-center gap-3">
                           <span>EAN: {spec.header?.ean || '---'}</span>
                           <span>|</span>
                           <span>Stato: {spec.isObsolete ? t('statusArchived') : spec.isSaved ? t('statusRead') : t('statusEdit')}</span>
                         </div>
                      </div>

                      <div className={`grid grid-cols-2 md:grid-cols-5 gap-4 text-white p-6 rounded-t-3xl shadow-inner ${spec.isObsolete ? 'bg-red-900' : 'bg-slate-800'}`}>
                         <div className="space-y-1"><label className="text-[8px] font-black uppercase opacity-60">{t('prodCode')}</label><input disabled={spec.isSaved} className="w-full bg-slate-700 p-2 rounded-lg text-xs font-bold border-none text-white shadow-inner disabled:opacity-50" value={spec.master?.codice} onChange={(e)=>updateSpecField(spec.id, 'master.codice', e.target.value)}/></div>
                         <div className="space-y-1"><label className="text-[8px] font-black uppercase opacity-60">{t('prodName')}</label><input disabled={spec.isSaved} className="w-full bg-slate-700 p-2 rounded-lg text-xs font-bold border-none text-white shadow-inner disabled:opacity-50" value={spec.master?.nome} onChange={(e)=>updateSpecField(spec.id, 'master.nome', e.target.value)}/></div>
                         <div className="space-y-1"><label className="text-[8px] font-black uppercase opacity-60">{t('uvcWeight')}</label><input disabled={spec.isSaved} className="w-full bg-slate-700 p-2 rounded-lg text-xs font-bold border-none text-white shadow-inner disabled:opacity-50" value={spec.header?.uvcWeight} onChange={(e)=>updateSpecField(spec.id, 'header.uvcWeight', e.target.value)}/></div>
                         <div className="space-y-1"><label className="text-[8px] font-black uppercase opacity-60">{t('eanCode')}</label><input disabled={spec.isSaved} className="w-full bg-slate-700 p-2 rounded-lg text-xs font-bold border-none text-white shadow-inner disabled:opacity-50" value={spec.header?.ean} onChange={(e)=>updateSpecField(spec.id, 'header.ean', e.target.value)}/></div>
                         <div className="space-y-1"><label className="text-[8px] font-black uppercase opacity-60 text-amber-300">{t('rev')}</label><input disabled className="w-full bg-slate-900 p-2 rounded-lg text-xs font-black border-none text-amber-300 shadow-inner text-center" value={spec.header?.revision || '0'} readOnly/></div>
                      </div>

                      <div className="bg-slate-100 p-6 -mt-10 rounded-b-3xl border border-t-0 border-slate-200">
                         <div className="flex flex-wrap gap-4 items-center mb-6 pb-6 border-b border-slate-300">
                            {/* RIGA 1: BOTTONI ESPORTAZIONE */}
                            <button onClick={exportAllSpecsToCSV} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm">
                              <Download size={16} /> {t('exportAll')}
                            </button>

                            <button onClick={() => generateSpecPDF(spec)} className="flex items-center gap-2 bg-red-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-red-700 transition-colors shadow-sm">
                              <Printer size={16} /> {t('exportPdf')}
                            </button>
                         </div>
                         
                         <div className="flex flex-wrap gap-4 items-center mb-2">
                            {/* RIGA 2: BOTTONI IMPORTAZIONE DOCUMENTI (Senza AI) CON CHECKBOX */}
                            <div className="relative flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 cursor-pointer transition-colors shadow-sm" title={t('titleImportTech')}>
                              {spec.importFlags?.tecnica && <span className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-md border-2 border-white"><Check size={12} strokeWidth={4}/></span>}
                              <FileUp size={16} /> <span>{t('importTech')}</span>
                              <input disabled={spec.isSaved} type="file" multiple accept=".pdf,.doc,.docx" className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" onChange={(e) => handleMultipleFileUpload(spec.id, 'attachedSheets', 600, e, 'tecnica')} />
                            </div>

                            <div className="relative flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-700 cursor-pointer transition-colors shadow-sm" title={t('titleImportLog')}>
                              {spec.importFlags?.logistica && <span className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-md border-2 border-white"><Check size={12} strokeWidth={4}/></span>}
                              <Truck size={16} /> <span>{t('importLog')}</span>
                              <input disabled={spec.isSaved} type="file" multiple accept=".pdf,.xls,.xlsx" className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" onChange={(e) => handleMultipleFileUpload(spec.id, 'attachedSheets', 600, e, 'logistica')} />
                            </div>

                            <div className="relative flex items-center gap-2 bg-teal-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-teal-700 cursor-pointer transition-colors shadow-sm" title={t('titleImportMicro')}>
                              {spec.importFlags?.microbiologici && <span className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-md border-2 border-white"><Check size={12} strokeWidth={4}/></span>}
                              <Microscope size={16} /> <span>{t('importMicro')}</span>
                              <input disabled={spec.isSaved} type="file" multiple accept=".pdf,.xls,.xlsx" className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" onChange={(e) => handleMultipleFileUpload(spec.id, 'attachedSheets', 600, e, 'microbiologici')} />
                            </div>

                            <div className="relative flex items-center gap-2 bg-cyan-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-cyan-700 cursor-pointer transition-colors shadow-sm" title={t('titleImportChem')}>
                              {spec.importFlags?.chimici && <span className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-md border-2 border-white"><Check size={12} strokeWidth={4}/></span>}
                              <FlaskRound size={16} /> <span>{t('importChem')}</span>
                              <input disabled={spec.isSaved} type="file" multiple accept=".pdf,.xls,.xlsx" className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" onChange={(e) => handleMultipleFileUpload(spec.id, 'attachedSheets', 600, e, 'chimici')} />
                            </div>

                            <div className="relative flex items-center gap-2 bg-purple-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-purple-700 cursor-pointer transition-colors shadow-sm" title={t('titleImportLabel')}>
                              {spec.importFlags?.etichetta && <span className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-md border-2 border-white"><Check size={12} strokeWidth={4}/></span>}
                              <ImageIcon size={16} /> <span>{t('importLabel')}</span>
                              <input disabled={spec.isSaved} type="file" multiple accept=".pdf,.jpg,.png,.jpeg" className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" onChange={(e) => handleMultipleFileUpload(spec.id, 'photos', 600, e, 'etichetta')} />
                            </div>

                            <div className="relative flex items-center gap-2 bg-amber-500 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-amber-600 cursor-pointer transition-colors shadow-sm" title={t('titleImportPhoto')}>
                              {spec.importFlags?.foto && <span className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-md border-2 border-white"><Check size={12} strokeWidth={4}/></span>}
                              <ImageIcon size={16} /> <span>{t('importPhoto')}</span>
                              <input disabled={spec.isSaved} type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" onChange={(e) => handleMultipleFileUpload(spec.id, 'photos', 600, e, 'foto')} />
                            </div>
                         </div>
                         
                         {/* MOSTRA I FILE ALLEGATI NELLA PAGINA */}
                         {((spec.attachedSheets && spec.attachedSheets.length > 0) || (spec.photos && spec.photos.length > 0)) && (
                           <div className="flex flex-col gap-3 mt-6 pt-4 border-t border-slate-300">
                             <span className="text-[10px] font-black text-slate-500 uppercase">{t('attachedFiles')}</span>
                             
                             {(spec.attachedSheets || []).map((file, idx) => (
                               <div key={`sheet-${idx}`} className="flex items-center justify-between gap-4 bg-white p-2 rounded-lg border shadow-sm w-fit pr-4">
                                 <div className="flex items-center gap-2 ml-2">
                                   <FileText size={14} className="text-blue-600"/>
                                   <span className="text-xs text-blue-600 font-bold max-w-[200px] truncate" title={file.name}>{file.name}</span>
                                 </div>
                                 <div className="flex items-center gap-2 ml-4 border-l border-slate-200 pl-3">
                                   <a href={file.data} download={file.name || `Scheda_${idx}`} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Scarica File">
                                     <Download size={16}/>
                                   </a>
                                   {!spec.isSaved && <button onClick={() => removeSpecFile(spec.id, 'attachedSheets', idx)} className="text-slate-300 hover:text-red-500 transition-colors" title="Rimuovi"><Trash2 size={16}/></button>}
                                 </div>
                               </div>
                             ))}

                             {(spec.photos || []).map((file, idx) => (
                               <div key={`photo-${idx}`} className="flex items-center justify-between gap-4 bg-white p-2 rounded-lg border shadow-sm w-fit pr-4">
                                 <div className="flex items-center gap-2 ml-2">
                                   <ImageIcon size={14} className="text-purple-600"/>
                                   <span className="text-xs text-purple-600 font-bold max-w-[200px] truncate" title={file.name}>{file.name}</span>
                                 </div>
                                 <div className="flex items-center gap-2 ml-4 border-l border-slate-200 pl-3">
                                   <a href={file.data} download={file.name || `Foto_${idx}`} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Scarica File">
                                     <Download size={16}/>
                                   </a>
                                   {!spec.isSaved && <button onClick={() => removeSpecFile(spec.id, 'photos', idx)} className="text-slate-300 hover:text-red-500 transition-colors" title="Rimuovi"><Trash2 size={16}/></button>}
                                 </div>
                               </div>
                             ))}
                           </div>
                         )}
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 text-slate-900 pointer-events-auto">
                        <div className="space-y-8">
                          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-amber-100 shadow-inner space-y-6">
                             <div className="flex items-center gap-4 border-b-2 border-amber-200 pb-2 text-amber-700 font-black uppercase text-xs"><Scale size={18}/> {t('sc_a')}</div>
                             <div className="space-y-4">
                                <input disabled={spec.isSaved} placeholder={t('legalName')} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.legalName || ''} onChange={(e)=>updateSpecField(spec.id, 'a.legalName', e.target.value)}/>
                                <input disabled={spec.isSaved} placeholder={t('claim')} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.claim || ''} onChange={(e)=>updateSpecField(spec.id, 'a.claim', e.target.value)}/>
                                <textarea disabled={spec.isSaved} placeholder={t('ingredients')} className="w-full p-3 bg-white rounded-xl text-xs font-bold h-24 border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.ingredients || ''} onChange={(e)=>updateSpecField(spec.id, 'a.ingredients', e.target.value)}/>
                                <div className="grid grid-cols-2 gap-4">
                                   <input disabled={spec.isSaved} placeholder={t('tmc')} className="p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.tmc || ''} onChange={(e)=>updateSpecField(spec.id, 'a.tmc', e.target.value)}/>
                                   <input disabled={spec.isSaved} placeholder={t('tmcFormat')} className="p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.tmcFormat || ''} onChange={(e)=>updateSpecField(spec.id, 'a.tmcFormat', e.target.value)}/>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                   <input disabled={spec.isSaved} placeholder={t('supplier')} className="p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.supplier || ''} onChange={(e)=>updateSpecField(spec.id, 'a.supplier', e.target.value)}/>
                                   <input disabled={spec.isSaved} placeholder={t('producedIn')} className="p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.producedIn || ''} onChange={(e)=>updateSpecField(spec.id, 'a.producedIn', e.target.value)}/>
                                </div>
                                <input disabled={spec.isSaved} placeholder={t('packaging')} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.packaging || ''} onChange={(e)=>updateSpecField(spec.id, 'a.packaging', e.target.value)}/>
                                <input disabled={spec.isSaved} placeholder={t('batchFormat')} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.batchFormat || ''} onChange={(e)=>updateSpecField(spec.id, 'a.batchFormat', e.target.value)}/>
                                <textarea disabled={spec.isSaved} placeholder={t('batchDecode')} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm h-20 disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.batchDecode || ''} onChange={(e)=>updateSpecField(spec.id, 'a.batchDecode', e.target.value)}/>
                                <input disabled={spec.isSaved} placeholder={t('prepMode')} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.prepMode || ''} onChange={(e)=>updateSpecField(spec.id, 'a.prepMode', e.target.value)}/>
                                <input disabled={spec.isSaved} placeholder={t('intendedUse')} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.intendedUse || ''} onChange={(e)=>updateSpecField(spec.id, 'a.intendedUse', e.target.value)}/>
                                <input disabled={spec.isSaved} placeholder={t('storage')} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.storage || ''} onChange={(e)=>updateSpecField(spec.id, 'a.storage', e.target.value)}/>
                                <textarea disabled={spec.isSaved} placeholder={t('processDesc')} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100 h-20" value={spec.a?.processDesc || ''} onChange={(e)=>updateSpecField(spec.id, 'a.processDesc', e.target.value)}/>
                                <textarea disabled={spec.isSaved} placeholder={t('envLabel')} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100 h-20" value={spec.a?.envLabel || ''} onChange={(e)=>updateSpecField(spec.id, 'a.envLabel', e.target.value)}/>
                                <input disabled={spec.isSaved} placeholder={t('packMode')} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.a?.packMode || ''} onChange={(e)=>updateSpecField(spec.id, 'a.packMode', e.target.value)}/>
                             </div>
                          </div>

                          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-amber-100 shadow-inner space-y-4">
                             <div className="flex justify-between items-center border-b-2 border-amber-200 pb-2">
                               <div className="flex items-center gap-4 text-amber-600 font-black uppercase text-xs"><Microscope size={18}/> {t('sc_b')}</div>
                               {!spec.isSaved && <button onClick={()=>addTableRow(spec.id, 'b')} className="p-1 bg-amber-600 text-white rounded-full hover:bg-amber-700 transition-colors"><Plus size={14}/></button>}
                             </div>
                             <div className="grid grid-cols-4 gap-2 text-[8px] font-black text-slate-400 px-1 uppercase"><span>{t('param')}</span><span>{t('limite')}</span><span>{t('risultato')}</span><span>{t('conforme')}</span></div>
                             {spec.b?.map(r => (
                                <div key={r.id} className="grid grid-cols-4 gap-2">
                                   <input disabled={spec.isSaved} className="p-2 bg-white rounded-lg text-[9px] font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={r.p || ''} onChange={(e)=>updateSpecTable(spec.id, 'b', r.id, 'p', e.target.value)}/>
                                   <input disabled={spec.isSaved} className="p-2 bg-white rounded-lg text-[9px] font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={r.limite || ''} onChange={(e)=>updateSpecTable(spec.id, 'b', r.id, 'limite', e.target.value)}/>
                                   <input disabled={spec.isSaved} className="p-2 bg-white rounded-lg text-[9px] font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={r.risultato || ''} onChange={(e)=>updateSpecTable(spec.id, 'b', r.id, 'risultato', e.target.value)}/>
                                   <select disabled={spec.isSaved} className={`p-2 bg-white rounded-lg text-[9px] font-bold border outline-none focus:ring-2 disabled:opacity-70 disabled:bg-slate-100 ${r.conforme === 'SÃ¬' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : r.conforme === 'No' ? 'bg-red-50 text-red-700 border-red-300' : 'border-transparent shadow-sm'}`} value={r.conforme || ''} onChange={(e)=>updateSpecTable(spec.id, 'b', r.id, 'conforme', e.target.value)}>
                                      <option value=""></option>
                                      <option value="SÃ¬">SÃ¬</option>
                                      <option value="No">No</option>
                                   </select>
                                </div>
                             ))}
                          </div>

                          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-emerald-100 shadow-inner space-y-4">
                             <div className="flex justify-between items-center border-b-2 border-emerald-200 pb-2 text-emerald-600 font-black uppercase text-xs">
                               <div className="flex items-center gap-4"><Apple size={18}/> {t('sc_c')}</div>
                               {!spec.isSaved && <button onClick={()=>addTableRow(spec.id, 'c')} className="p-1 bg-emerald-600 text-white rounded-full"><Plus size={14}/></button>}
                             </div>
                             <div className="grid grid-cols-2 gap-4 text-[8px] font-black text-slate-400 px-1 uppercase"><span>{t('element')}</span><span>{t('value')}</span></div>
                             {spec.c?.map(r => (
                                <div key={r.id} className="grid grid-cols-2 gap-2">
                                   <input disabled={spec.isSaved} className="p-2 bg-white rounded-lg text-[10px] font-bold shadow-sm border-none disabled:opacity-70 disabled:bg-slate-100" value={r.p || ''} onChange={(e)=>updateSpecTable(spec.id, 'c', r.id, 'p', e.target.value)}/>
                                   <input disabled={spec.isSaved} className="p-2 bg-white rounded-lg text-[10px] font-bold shadow-sm border-none disabled:opacity-70 disabled:bg-slate-100" value={r.v || ''} onChange={(e)=>updateSpecTable(spec.id, 'c', r.id, 'v', e.target.value)}/>
                                </div>
                             ))}
                          </div>
                        </div>

                        <div className="space-y-8">
                          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-indigo-100 shadow-inner space-y-4">
                             <div className="flex justify-between items-center border-b-2 border-indigo-200 pb-2 text-indigo-600 font-black uppercase text-xs">
                               <div className="flex items-center gap-4"><FlaskRound size={18}/> {t('sc_d')}</div>
                               {!spec.isSaved && <button onClick={()=>addTableRow(spec.id, 'd')} className="p-1 bg-indigo-600 text-white rounded-full"><Plus size={14}/></button>}
                             </div>
                             <div className="grid grid-cols-4 gap-2 text-[8px] font-black text-slate-400 px-1 uppercase"><span>{t('param')}</span><span>{t('limite')}</span><span>{t('risultato')}</span><span>{t('conforme')}</span></div>
                             {spec.d?.map(r => (
                                <div key={r.id} className="grid grid-cols-4 gap-2">
                                   <input disabled={spec.isSaved} className="p-2 bg-white rounded-lg text-[9px] font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={r.p || ''} onChange={(e)=>updateSpecTable(spec.id, 'd', r.id, 'p', e.target.value)}/>
                                   <input disabled={spec.isSaved} className="p-2 bg-white rounded-lg text-[9px] font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={r.limite || ''} onChange={(e)=>updateSpecTable(spec.id, 'd', r.id, 'limite', e.target.value)}/>
                                   <input disabled={spec.isSaved} className="p-2 bg-white rounded-lg text-[9px] font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={r.risultato || ''} onChange={(e)=>updateSpecTable(spec.id, 'd', r.id, 'risultato', e.target.value)}/>
                                   <select disabled={spec.isSaved} className={`p-2 bg-white rounded-lg text-[9px] font-bold border outline-none focus:ring-2 disabled:opacity-70 disabled:bg-slate-100 ${r.conforme === 'SÃ¬' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : r.conforme === 'No' ? 'bg-red-50 text-red-700 border-red-300' : 'border-transparent shadow-sm'}`} value={r.conforme || ''} onChange={(e)=>updateSpecTable(spec.id, 'd', r.id, 'conforme', e.target.value)}>
                                      <option value=""></option>
                                      <option value="SÃ¬">SÃ¬</option>
                                      <option value="No">No</option>
                                   </select>
                                </div>
                             ))}
                          </div>

                          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-orange-100 shadow-inner space-y-6">
                             <div className="flex items-center gap-4 border-b border-orange-200 pb-2 text-orange-600 font-black uppercase text-xs"><UtensilsCrossed size={18}/> {t('sc_e')}</div>
                             <div className="space-y-3">
                                {[['consistency', t('consistency')], ['aroma', t('aroma')], ['look', t('look')], ['taste', t('taste')]].map(([f, label]) => (
                                  <div key={f} className="space-y-1"><label className="text-[8px] font-black uppercase opacity-60 ml-1">{label}</label><input disabled={spec.isSaved} className="w-full p-2 bg-white rounded-lg text-[10px] font-bold border-none shadow-sm disabled:opacity-70 disabled:bg-slate-100" value={spec.e?.[f] || ''} onChange={(e)=>updateSpecField(spec.id, `e.${f}`, e.target.value)}/></div>
                                ))}
                             </div>
                          </div>

                          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-red-100 shadow-inner space-y-4 overflow-x-auto relative">
                             <div className="flex items-center justify-between border-b border-red-200 pb-2">
                               <div className="flex items-center gap-4 text-red-700 font-black uppercase text-xs"><AlertCircle size={18}/> {t('sc_f')}</div>
                               {isTestUser && <button onClick={addGlobalAllergen} className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors" title="Aggiungi Allergene Globalmente"><Plus size={14}/></button>}
                             </div>
                             <div className="grid grid-cols-12 gap-2 text-[8px] font-black text-slate-400 px-1 uppercase text-center min-w-full">
                                <div className="col-span-3 text-left">{t('allergen')}</div>
                                <div className="col-span-3">{t('presence')}</div>
                                <div className="col-span-3">{t('traces')}</div>
                                <div className="col-span-3 text-left">{t('notes')}</div>
                             </div>
                             <div className="divide-y divide-slate-200 min-w-full">
                                {globalConfig.allergeni.map((all, idx) => {
                                  const getAllergenColor = (val) => {
                                    if (!val || val === t('no')) return 'bg-emerald-50 text-emerald-700 border-emerald-300';
                                    return 'bg-red-50 text-red-700 border-red-300';
                                  };
                                  return (
                                  <div key={all.id} className="grid grid-cols-12 gap-4 items-center py-2 group">
                                     <div className="col-span-3 text-[9px] font-black uppercase text-slate-700 leading-tight text-left relative">
                                        {isTestUser ? (
                                           <div className="flex items-center gap-1">
                                             <textarea className="w-full p-1 border rounded" value={all[lang] || ''} onChange={(e) => updateGlobalAllergen(idx, lang, e.target.value)} />
                                             <button onClick={() => removeGlobalAllergen(idx)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                                           </div>
                                        ) : (
                                           all[lang] || all.it
                                        )}
                                     </div>
                                     <div className="col-span-3">
                                        <select disabled={spec.isSaved} className={`w-full p-2 border rounded text-[9px] font-bold outline-none disabled:opacity-70 focus:border-blue-500 transition-colors ${getAllergenColor(spec.f?.find(r => r.id === all.id)?.presenza)}`} value={spec.f?.find(r => r.id === all.id)?.presenza || t('no')} onChange={(e)=>updateSpecTable(spec.id, 'f', all.id, 'presenza', e.target.value)}>
                                           <option value={t('no')}>{t('no')}</option>
                                           <option value="SÃ¬ (Ingrediente)">SÃ¬ (Ingrediente)</option>
                                           <option value="SÃ¬ (Derivato/Additivo)">SÃ¬ (Derivato/Additivo)</option>
                                        </select>
                                     </div>
                                     <div className="col-span-3">
                                        <select disabled={spec.isSaved} className={`w-full p-2 border rounded text-[9px] font-bold outline-none disabled:opacity-70 focus:border-blue-500 transition-colors ${getAllergenColor(spec.f?.find(r => r.id === all.id)?.tracce)}`} value={spec.f?.find(r => r.id === all.id)?.tracce || t('no')} onChange={(e)=>updateSpecTable(spec.id, 'f', all.id, 'tracce', e.target.value)}>
                                           <option value={t('no')}>{t('no')}</option>
                                           <option value="Possibile (Stessa linea)">Possibile (Stessa linea)</option>
                                           <option value="Possibile (Stesso stabilimento)">Possibile (Stesso stab.)</option>
                                        </select>
                                     </div>
                                     <div className="col-span-3">
                                        <input disabled={spec.isSaved} type="text" className="w-full p-2 bg-white border border-slate-200 rounded text-[9px] font-bold outline-none disabled:opacity-70 focus:border-blue-500" placeholder="Note..." value={spec.f?.find(r => r.id === all.id)?.note || ''} onChange={(e)=>updateSpecTable(spec.id, 'f', all.id, 'note', e.target.value)} />
                                     </div>
                                  </div>
                                )})}
                             </div>
                          </div>

                          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-blue-900 shadow-inner space-y-6">
                             <div className="flex items-center gap-4 border-b border-blue-900 pb-2 text-blue-900 font-black uppercase text-xs"><Dna size={18}/> {t('sc_g')}</div>
                             <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                     <span className="text-[10px] font-bold text-slate-700">{t('containsGmo')}</span>
                                     <div className="flex gap-2">
                                        {[t('yes'), t('no')].map(v=>(<button disabled={spec.isSaved} key={v} onClick={()=>updateSpecField(spec.id, `g.containsGmo`, v)} className={`px-4 py-2 rounded-xl text-[10px] font-black disabled:cursor-not-allowed ${spec.g?.containsGmo === v ? 'bg-blue-900 text-white' : 'bg-white border text-slate-400'}`}>{v}</button>))}
                                     </div>
                                  </div>
                                  <textarea disabled={spec.isSaved} placeholder={t('notesGmo')} className="w-full p-3 bg-white rounded-xl text-xs font-bold border-none shadow-sm h-20 disabled:opacity-70 disabled:bg-slate-100" value={spec.g?.statement} onChange={(e)=>updateSpecField(spec.id, 'g.statement', e.target.value)}/>
                             </div>
                          </div>

                          <div className="bg-slate-50 p-8 rounded-[3rem] border border-blue-100 shadow-inner space-y-6">
                             <div className="flex items-center gap-4 border-b-2 border-blue-200 pb-2 text-blue-700 font-black uppercase text-xs"><Package size={24}/> {t('sc_h')}</div>
                             
                             <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse bg-white shadow-sm rounded-xl overflow-hidden min-w-[500px]">
                                  <thead className="bg-slate-200 text-[9px] uppercase font-black text-slate-700">
                                    <tr>
                                      <th className="border border-slate-300 p-2 w-[28%]">{t('logParam')}</th>
                                      <th className="border border-slate-300 p-2 w-[24%] text-center">{t('logUvc')}</th>
                                      <th className="border border-slate-300 p-2 w-[24%] text-center">{t('logCarton')}</th>
                                      <th className="border border-slate-300 p-2 w-[24%] text-center">{t('logPallet')}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="text-[9px] text-slate-800 font-bold">
                                    <tr>
                                      <td className="border border-slate-300 p-2 bg-slate-50">{t('eanItfType')}</td>
                                      <td className="border border-slate-300 p-1"><input disabled={spec.isSaved} className="w-full p-2 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none font-bold disabled:opacity-70" value={spec.log?.uvc?.ean || ''} onChange={(e)=>updateSpecField(spec.id, 'log.uvc.ean', e.target.value)} placeholder="EAN"/></td>
                                      <td className="border border-slate-300 p-1"><input disabled={spec.isSaved} className="w-full p-2 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none font-bold disabled:opacity-70" value={spec.log?.box?.itf || ''} onChange={(e)=>updateSpecField(spec.id, 'log.box.itf', e.target.value)} placeholder="ITF"/></td>
                                      <td className="border border-slate-300 p-1"><input disabled={spec.isSaved} className="w-full p-2 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none font-bold disabled:opacity-70" value={spec.log?.pallet?.tipo || ''} onChange={(e)=>updateSpecField(spec.id, 'log.pallet.tipo', e.target.value)} placeholder="Tipo"/></td>
                                    </tr>
                                    <tr>
                                      <td className="border border-slate-300 p-2 bg-slate-50">{t('dims')}</td>
                                      <td className="border border-slate-300 p-1">
                                        <div className="flex gap-1">
                                          <input disabled={spec.isSaved} className="w-1/3 p-1.5 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none disabled:opacity-70" placeholder={t('l')} value={spec.log?.uvc?.l || ''} onChange={(e)=>updateSpecField(spec.id, 'log.uvc.l', e.target.value)}/>
                                          <input disabled={spec.isSaved} className="w-1/3 p-1.5 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none disabled:opacity-70" placeholder={t('p')} value={spec.log?.uvc?.p || ''} onChange={(e)=>updateSpecField(spec.id, 'log.uvc.p', e.target.value)}/>
                                          <input disabled={spec.isSaved} className="w-1/3 p-1.5 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none disabled:opacity-70" placeholder={t('h')} value={spec.log?.uvc?.h || ''} onChange={(e)=>updateSpecField(spec.id, 'log.uvc.h', e.target.value)}/>
                                        </div>
                                      </td>
                                      <td className="border border-slate-300 p-1">
                                        <div className="flex gap-1">
                                          <input disabled={spec.isSaved} className="w-1/3 p-1.5 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none disabled:opacity-70" placeholder={t('l')} value={spec.log?.box?.l || ''} onChange={(e)=>updateSpecField(spec.id, 'log.box.l', e.target.value)}/>
                                          <input disabled={spec.isSaved} className="w-1/3 p-1.5 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none disabled:opacity-70" placeholder={t('p')} value={spec.log?.box?.p || ''} onChange={(e)=>updateSpecField(spec.id, 'log.box.p', e.target.value)}/>
                                          <input disabled={spec.isSaved} className="w-1/3 p-1.5 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none disabled:opacity-70" placeholder={t('h')} value={spec.log?.box?.h || ''} onChange={(e)=>updateSpecField(spec.id, 'log.box.h', e.target.value)}/>
                                        </div>
                                      </td>
                                      <td className="border border-slate-300 p-1"><input disabled={spec.isSaved} className="w-full p-2 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none font-bold disabled:opacity-70" value={spec.log?.pallet?.alt || ''} onChange={(e)=>updateSpecField(spec.id, 'log.pallet.alt', e.target.value)} placeholder={t('hTot')}/></td>
                                    </tr>
                                    <tr>
                                      <td className="border border-slate-300 p-2 bg-slate-50">{t('netDrain')}</td>
                                      <td className="border border-slate-300 p-1">
                                        <div className="flex gap-1">
                                          <input disabled={spec.isSaved} className="w-1/2 p-1.5 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none disabled:opacity-70" placeholder={t('net')} value={spec.log?.uvc?.pesoNetto || ''} onChange={(e)=>updateSpecField(spec.id, 'log.uvc.pesoNetto', e.target.value)}/>
                                          <input disabled={spec.isSaved} className="w-1/2 p-1.5 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none disabled:opacity-70" placeholder={t('drain')} value={spec.log?.uvc?.pesoSgocc || ''} onChange={(e)=>updateSpecField(spec.id, 'log.uvc.pesoSgocc', e.target.value)}/>
                                        </div>
                                      </td>
                                      <td className="border border-slate-300 p-2 bg-slate-100 text-center text-slate-400">---</td>
                                      <td className="border border-slate-300 p-2 bg-slate-100 text-center text-slate-400">---</td>
                                    </tr>
                                    <tr>
                                      <td className="border border-slate-300 p-2 bg-slate-50">{t('tareGross')}</td>
                                      <td className="border border-slate-300 p-1">
                                        <div className="flex gap-1">
                                          <input disabled={spec.isSaved} className="w-1/2 p-1.5 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none disabled:opacity-70" placeholder={t('tare')} value={spec.log?.uvc?.tara || ''} onChange={(e)=>updateSpecField(spec.id, 'log.uvc.tara', e.target.value)}/>
                                          <input disabled={spec.isSaved} className="w-1/2 p-1.5 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none disabled:opacity-70" placeholder={t('gross')} value={spec.log?.uvc?.pesoLordo || ''} onChange={(e)=>updateSpecField(spec.id, 'log.uvc.pesoLordo', e.target.value)}/>
                                        </div>
                                      </td>
                                      <td className="border border-slate-300 p-1">
                                        <div className="flex gap-1">
                                          <input disabled={spec.isSaved} className="w-1/2 p-1.5 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none disabled:opacity-70" placeholder={t('tare')} value={spec.log?.box?.tara || ''} onChange={(e)=>updateSpecField(spec.id, 'log.box.tara', e.target.value)}/>
                                          <input disabled={spec.isSaved} className="w-1/2 p-1.5 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none disabled:opacity-70" placeholder={t('gross')} value={spec.log?.box?.pesoLordo || ''} onChange={(e)=>updateSpecField(spec.id, 'log.box.pesoLordo', e.target.value)}/>
                                        </div>
                                      </td>
                                      <td className="border border-slate-300 p-1"><input disabled={spec.isSaved} className="w-full p-2 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none font-bold disabled:opacity-70" value={spec.log?.pallet?.pesoTot || ''} onChange={(e)=>updateSpecField(spec.id, 'log.pallet.pesoTot', e.target.value)} placeholder={t('wTot')}/></td>
                                    </tr>
                                    <tr>
                                      <td className="border border-slate-300 p-2 bg-slate-50">{t('composition')}</td>
                                      <td className="border border-slate-300 p-2 bg-slate-100 text-center text-slate-400">---</td>
                                      <td className="border border-slate-300 p-1"><input disabled={spec.isSaved} className="w-full p-2 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none font-bold disabled:opacity-70" value={spec.log?.box?.pz || ''} onChange={(e)=>updateSpecField(spec.id, 'log.box.pz', e.target.value)} placeholder={t('pzCarton')}/></td>
                                      <td className="border border-slate-300 p-1">
                                        <div className="flex gap-1">
                                          <input disabled={spec.isSaved} className="w-1/3 p-1.5 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none text-[8px] disabled:opacity-70" placeholder={t('cLayer')} value={spec.log?.pallet?.cLayer || ''} onChange={(e)=>updateSpecField(spec.id, 'log.pallet.cLayer', e.target.value)}/>
                                          <input disabled={spec.isSaved} className="w-1/3 p-1.5 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none text-[8px] disabled:opacity-70" placeholder={t('layers')} value={spec.log?.pallet?.layers || ''} onChange={(e)=>updateSpecField(spec.id, 'log.pallet.layers', e.target.value)}/>
                                          <input disabled={spec.isSaved} className="w-1/3 p-1.5 bg-yellow-100 border border-yellow-300 rounded text-center focus:ring-2 outline-none text-[8px] disabled:opacity-70" placeholder={t('totCarton')} value={spec.log?.pallet?.totC || ''} onChange={(e)=>updateSpecField(spec.id, 'log.pallet.totC', e.target.value)}/>
                                        </div>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                             </div>
                          </div>

                          {/* NUOVA SEZIONE: DOCUMENTAZIONE OBBLIGATORIA (PDF) */}
                          <div className="bg-slate-50 p-8 rounded-[3rem] border border-blue-100 shadow-inner space-y-6">
                             <div className="flex items-center gap-4 border-b-2 border-blue-200 pb-2 text-blue-700 font-black uppercase text-xs"><FileText size={24}/> {t('specDocsTitle')}</div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                   { key: 'moca', label: t('moca') },
                                   { key: 'haccp', label: t('haccp') },
                                   { key: 'packSheet', label: t('packSheet') },
                                   { key: 'bio', label: t('bio') },
                                   { key: 'shelfLife', label: t('shelfLife') }
                                ].map(docType => {
                                   const file = spec.specDocs?.[docType.key];
                                   return (
                                      <div key={docType.key} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-start justify-between gap-3">
                                         <span className="text-[10px] font-black uppercase text-slate-500">{docType.label}</span>
                                         {file ? (
                                            <div className="w-full flex items-center justify-between gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100">
                                               <span className="text-xs text-blue-600 font-bold max-w-[150px] truncate" title={file.name}>{file.name}</span>
                                               <div className="flex items-center gap-3">
                                                  <a href={file.data} download={file.name} className="text-blue-600 hover:text-emerald-600 transition-colors" title="Scarica">
                                                     <Download size={18}/>
                                                  </a>
                                                  {!spec.isSaved && (
                                                     <button onClick={() => removeSpecDoc(spec.id, docType.key)} className="text-slate-400 hover:text-red-500 transition-colors" title="Rimuovi">
                                                        <Trash2 size={18}/>
                                                     </button>
                                                  )}
                                               </div>
                                            </div>
                                         ) : (
                                            <div className="relative w-full">
                                               <button disabled={spec.isSaved} className="w-full bg-slate-50 text-slate-500 py-3 rounded-xl text-[10px] font-black uppercase border border-dashed border-slate-300 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed pointer-events-none">
                                                  <UploadCloud size={16}/> Carica PDF
                                               </button>
                                               {!spec.isSaved && (
                                                  <input type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleSpecDocUpload(spec.id, docType.key, e)} />
                                               )}
                                            </div>
                                         )}
                                      </div>
                                   )
                                })}
                             </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'admin' && (
        <div className="min-h-screen bg-slate-50 p-10 font-sans text-slate-900">
          {!adminAuth ? (
            <div className="max-w-md mx-auto mt-20 bg-white p-12 rounded-[3rem] shadow-xl text-center border">
              <Lock className="mx-auto text-blue-600 mb-8" size={64} />
              <h2 className="text-3xl font-black mb-8 uppercase tracking-tighter">Admin Access</h2>
              <input type="password" placeholder={t('passwordPlaceholder')} className="w-full border-4 p-6 rounded-3xl mb-8 text-center text-4xl font-mono focus:border-blue-500 outline-none shadow-inner" onChange={(e) => { if(e.target.value === '0404') setAdminAuth(true); }} />
              <button onClick={goHome} className="text-slate-400 uppercase font-black text-xs hover:text-slate-900">Torna Home</button>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-12">
              <div className="flex justify-between items-center">
                <h2 className="text-5xl font-black flex items-center gap-6"><button onClick={goHome} className="p-4 bg-white rounded-3xl shadow hover:bg-slate-100 transition-all"><ArrowLeft size={32}/></button>PROFILI FORNITORI</h2>
                <button onClick={() => setEditingSupplier({ name: '', qualPass: '', techPass: '' })} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-blue-700 flex items-center gap-2"><PlusCircle size={20}/> Nuovo Fornitore</button>
              </div>
              {editingSupplier && (
                 <div className="bg-white p-12 rounded-[4rem] shadow-2xl border-4 border-blue-100 animate-in zoom-in duration-300">
                   <h3 className="text-2xl font-black mb-10 uppercase">{editingSupplier.id ? "Modifica Profilo" : "Nuovo Profilo Fornitore"}</h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <input placeholder="Ragione Sociale" className="p-6 bg-slate-50 rounded-3xl font-bold border-none shadow-inner" value={editingSupplier.name} onChange={(e)=>setEditingSupplier({...editingSupplier, name: e.target.value})}/>
                      <input placeholder="Password Qualifica" className="p-6 bg-emerald-50 rounded-3xl font-mono border-none shadow-inner" value={editingSupplier.qualPass} onChange={(e)=>setEditingSupplier({...editingSupplier, qualPass: e.target.value})}/>
                      <input placeholder="Password Tecnica" className="p-6 bg-amber-50 rounded-3xl font-mono border-none shadow-inner" value={editingSupplier.techPass} onChange={(e)=>setEditingSupplier({...editingSupplier, techPass: e.target.value})}/>
                   </div>
                   <div className="mt-12 flex gap-6">
                      <button onClick={async () => {
                        if(!editingSupplier.name) return;
                        if(editingSupplier.id) { await api.updateSupplier(editingSupplier.id, editingSupplier); }
                        else { await api.createSupplier(editingSupplier); }
                        setEditingSupplier(null);
                        fetchSuppliers();
                      }} className="bg-slate-900 text-white px-12 py-5 rounded-3xl font-black uppercase text-xs shadow-xl hover:bg-blue-600 transition-all">Salva Database</button>
                      <button onClick={()=>setEditingSupplier(null)} className="text-slate-400 font-black uppercase text-xs">Annulla</button>
                   </div>
                 </div>
              )}
              <div className="bg-white rounded-[4rem] shadow-sm border overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b text-[10px] font-black uppercase tracking-widest text-slate-400"><tr><th className="p-10">Azienda</th><th className="p-10">Qual Pass</th><th className="p-10">Tech Pass</th><th className="p-10 text-right">Azioni</th></tr></thead>
                    <tbody className="divide-y">
                      {suppliers.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-10 font-black text-2xl uppercase tracking-tighter leading-none">{s.name}</td>
                          <td className="p-10 font-mono text-emerald-600 font-bold text-xl">{s.qualPass}</td>
                          <td className="p-10 font-mono text-amber-600 font-bold text-xl">{s.techPass}</td>
                          <td className="p-10 text-right space-x-4">
                             <button onClick={()=>setEditingSupplier(s)} className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"><Edit3 size={24}/></button>
                             <button onClick={(e) => { 
                                e.stopPropagation();
                                showConfirm("Cancellare fornitore?", async () => { 
                                   await api.deleteSupplier(s.id); 
                                   fetchSuppliers();
                                });
                             }} className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={24}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </div>
          )}
        </div>
      )}

      {view === 'supplier_qual' && (
        <div className="min-h-screen bg-slate-50 font-sans pb-20 text-slate-900">
          <nav className="bg-white border-b sticky top-0 z-30 px-10 py-6 flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-6"><CheckCircle2 size={32} className="text-emerald-600" /><h2 className="text-2xl font-black uppercase tracking-tighter">{currentSupplier?.name}</h2></div>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end mr-2">
                <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  {t('connected')}
                </span>
                {lastSyncTime && <span className="text-[9px] font-bold text-slate-400 mt-0.5">{t('lastSync')} {lastSyncTime}</span>}
              </div>
              <button onClick={saveProgress} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-emerald-700 transition-all shadow-lg flex items-center gap-2"><UploadCloud size={16}/> Sync</button>
              <button onClick={goHome} className="bg-slate-100 p-4 rounded-2xl text-slate-500 hover:text-slate-900 transition-all shadow-sm"><ArrowLeft size={24}/></button>
            </div>
          </nav>
          <div className="max-w-7xl mx-auto p-12">
            <div className="flex bg-white/50 backdrop-blur p-2 rounded-[2.5rem] border border-slate-200 mb-12 overflow-x-auto shadow-inner">
              {[
                 {id: 'ANAGRAFICA', label: t('tabAnagrafica')},
                 {id: 'CONTATTI', label: t('tabContatti')},
                 {id: 'CERTIFICAZIONI', label: t('tabCertificazioni')},
                 {id: 'FILE_A', label: t('tabDichiarazioneA')},
                 {id: 'FILE_B', label: t('tabDichiarazioneB')},
                 {id: 'FILE_C', label: t('tabProdotti')},
                 {id: 'PDF', label: t('tabDossier')},
                 {id: 'SIGNED', label: t('tabDossierFirmato')}
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-5 px-6 rounded-[2rem] text-[10px] font-black uppercase whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl scale-[1.05]' : 'text-slate-400 hover:text-slate-800'}`}>{tab.label}</button>
              ))}
            </div>
            <div className="bg-white rounded-[4rem] shadow-2xl border border-slate-100 p-16 min-h-[600px]">
               
              {activeTab === 'ANAGRAFICA' && (
                <div className="space-y-16">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-6"><Building2 size={48} /><h3 className="text-5xl font-black uppercase tracking-tighter">{t('tabAnagrafica')}</h3></div>
                    <button onClick={saveProgress} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm"><Save size={16} /> {t('save')}</button>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full mb-12" />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                    {['rs', 'piva', 'sede', 'citta', 'provincia', 'cap', 'nazione'].map(f => (
                      <div key={f} className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest ml-2">{t(f).toUpperCase()}</label>
                        <input type="text" className="w-full bg-slate-50 p-6 rounded-3xl border-none font-black shadow-inner outline-none focus:ring-2 ring-emerald-100" value={qualData.anagrafica[f] || ''} onChange={(e) => updateAnagrafica(f, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {activeTab === 'CONTATTI' && (
                <div className="space-y-12 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-6"><Users size={48} className="text-slate-900"/><h3 className="text-5xl font-black uppercase tracking-tighter text-slate-900">{t('tabContatti')}</h3></div>
                    <button onClick={saveProgress} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm"><Save size={16} /> {t('save')}</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-slate-900">
                    {Object.entries(qualData.contatti).map(([dept, data]) => (
                      <div key={dept} className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 shadow-inner">
                        <h4 className="text-xl font-black uppercase mb-6 text-slate-700">{dept}</h4>
                        <div className="space-y-4">
                          <input placeholder={t('name')} className="w-full p-4 rounded-xl border-none shadow-sm font-bold text-sm" value={data.nome || ''} onChange={(e)=>updateContatti(dept, 'nome', e.target.value)} />
                          <input placeholder={t('email')} className="w-full p-4 rounded-xl border-none shadow-sm font-bold text-sm" value={data.email || ''} onChange={(e)=>updateContatti(dept, 'email', e.target.value)} />
                          <input placeholder={t('tel')} className="w-full p-4 rounded-xl border-none shadow-sm font-bold text-sm" value={data.tel || ''} onChange={(e)=>updateContatti(dept, 'tel', e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'CERTIFICAZIONI' && (
                <div className="space-y-12 animate-in fade-in duration-300">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                    <div className="flex items-center gap-6"><Award size={48} className="text-slate-900"/><h3 className="text-5xl font-black uppercase tracking-tighter text-slate-900">{t('tabCertificazioni')}</h3></div>
                    <div className="flex items-center gap-3">
                      <button onClick={saveProgress} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm"><Save size={16} /> {t('save')}</button>
                      <button onClick={addCert} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"><Plus size={16}/> Aggiungi Certificazione</button>
                    </div>
                  </div>
                  <div className="space-y-6 text-slate-900">
                    {qualData.certificazioni.map(cert => {
                      const status = getCertStatus(cert.expiry);
                      return (
                        <div key={cert.id} className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-inner relative">
                          <div className="flex-1 w-full">
                            <div className="flex items-center gap-4 mb-2">
                               <input className="text-2xl font-black uppercase text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none w-full md:w-auto" value={cert.type} onChange={(e)=>updateCert(cert.id, 'type', e.target.value)} placeholder="Nome Certificazione"/>
                               <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${status.color}`}>
                                 {status.label}
                               </span>
                            </div>
                            {cert.fileName ? (
                               <div className="flex items-center gap-3 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 inline-flex mt-2">
                                 <p className="text-xs text-blue-600 font-bold max-w-[250px] truncate" title={cert.fileName}>File: {cert.fileName}</p>
                                 {cert.fileData && (
                                   <div className="flex items-center gap-1 border-l border-blue-200 pl-3 ml-1">
                                     <a href={cert.fileData} download={cert.fileName} className="text-blue-600 hover:text-emerald-600 bg-white p-1.5 rounded-lg shadow-sm transition-all" title="Scarica Allegato">
                                       <Download size={14}/>
                                     </a>
                                     <button onClick={() => deleteCertFile(cert.id)} className="text-slate-400 hover:text-red-600 bg-white p-1.5 rounded-lg shadow-sm transition-all" title="Elimina Allegato">
                                       <Trash2 size={14}/>
                                     </button>
                                   </div>
                                 )}
                               </div>
                            ) : (
                               <p className="text-xs text-slate-400 font-bold mt-2">Nessun file PDF caricato</p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                            <div className="space-y-1 w-full md:w-auto">
                               <label className="text-[10px] font-black uppercase text-slate-500">Data di Scadenza</label>
                               <input type="date" className="p-3 w-full rounded-xl shadow-sm border-none font-bold text-sm bg-white outline-none focus:ring-2 ring-blue-500" value={cert.expiry || ''} onChange={(e)=>updateCert(cert.id, 'expiry', e.target.value)} />
                            </div>
                            <div className="relative overflow-hidden inline-block w-full md:w-auto mt-4 md:mt-0">
                               <button className="w-full bg-slate-900 text-white rounded-xl px-6 py-3 font-black text-xs uppercase hover:bg-slate-700 transition-colors shadow-sm flex items-center justify-center gap-2 pointer-events-none">
                                 <UploadCloud size={16}/> Carica PDF
                               </button>
                               <input type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleCertUpload(cert.id, e)} />
                            </div>
                            {!['ifs', 'brc', 'haccp', 'bio', 'moca'].includes(cert.id) && (
                              <button onClick={()=>removeCert(cert.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20}/></button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4 - ALLERGENI CON MENÃ™ A TENDINA E NOTE */}
              {activeTab === 'FILE_A' && (
                <div className="space-y-12 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6"><AlertCircle size={48} className="text-slate-900"/><h3 className="text-5xl font-black uppercase tracking-tighter text-slate-900">{t('tabDichiarazioneA')}</h3></div>
                    <button onClick={saveProgress} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm"><Save size={16} /> {t('save')}</button>
                  </div>
                  
                  <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-200 shadow-inner">
                     <div className="flex items-center justify-between border-b-2 border-slate-200 pb-4 mb-8">
                       <h4 className="text-2xl font-black uppercase text-slate-800">Dichiarazioni OGM, Etichettatura e Impegni Integrali</h4>
                       {isTestUser && <button onClick={addGlobalImpegnoA} className="text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-emerald-100 flex items-center gap-2"><Plus size={14}/> Aggiungi Impegno</button>}
                     </div>
                     <div className="space-y-6">
                        {globalConfig.impegniA.map((imp, idx) => {
                           const isStr = typeof imp === 'string';
                           const textValue = isStr ? imp : (imp[lang] || imp.it || imp);
                           return (
                             <div key={isStr ? `imp_${idx}` : imp.id} className="flex items-start gap-4 group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-300 transition-colors relative">
                                <input type="checkbox" className="mt-1 w-6 h-6 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 shrink-0" checked={qualData.fileA.impegni[idx] || false} onChange={(e)=>updateFileAImpegno(idx, e.target.checked)} />
                                {isTestUser ? (
                                   <textarea className="w-full p-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 min-h-[60px]" value={textValue} onChange={(e) => updateGlobalImpegnoA(idx, lang, e.target.value)} />
                                ) : (
                                   <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors leading-relaxed text-justify">{textValue}</span>
                                )}
                                {isTestUser && <button onClick={(e) => { e.preventDefault(); removeGlobalImpegnoA(idx); }} className="absolute -right-2 -top-2 bg-red-100 text-red-600 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"><X size={12}/></button>}
                             </div>
                           );
                        })}
                     </div>
                  </div>

                  <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-200 shadow-inner overflow-x-auto relative">
                     <div className="flex items-center justify-between border-b-2 border-slate-200 pb-4 mb-8">
                       <h4 className="text-2xl font-black uppercase text-slate-800">Griglia Allergeni (Intero Stabilimento)</h4>
                       {isTestUser && <button onClick={addGlobalAllergen} className="text-blue-600 bg-blue-50 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-blue-100 flex items-center gap-2"><Plus size={14}/> Aggiungi Allergene</button>}
                     </div>
                     <table className="w-full text-left min-w-[800px]">
                        <thead className="text-[10px] uppercase font-black text-slate-400">
                           <tr>
                             <th className="pb-4 px-2 w-[35%]">Allergene</th>
                             <th className="pb-4 px-2 w-[20%]">Stato in Stabilimento</th>
                             <th className="pb-4 px-2 w-[25%]">Gestione Preventiva / Rischio</th>
                             <th className="pb-4 px-2 w-[20%]">Note Aggiuntive</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-800">
                           {globalConfig.allergeni.map((all, idx) => (
                              <tr key={all.id} className="hover:bg-slate-100 transition-colors group relative">
                                 <td className="py-4 px-2 text-xs font-bold leading-tight">
                                    {isTestUser ? (
                                      <div className="flex items-center gap-2">
                                        <textarea className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500" value={all[lang] || all.it} onChange={(e) => updateGlobalAllergen(idx, lang, e.target.value)} />
                                        <button onClick={() => removeGlobalAllergen(idx)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                      </div>
                                    ) : (
                                      all[lang] || all.it
                                    )}
                                 </td>
                                 <td className="py-4 px-2">
                                    <select className="w-full p-2 rounded-lg border border-slate-200 shadow-sm text-xs font-bold bg-white outline-none focus:border-blue-500" 
                                            value={typeof qualData.fileA.allergeniPresence[idx] === 'boolean' ? (qualData.fileA.allergeniPresence[idx] ? 'Presente' : 'Assente') : (qualData.fileA.allergeniPresence[idx] || 'Assente')} 
                                            onChange={(e) => updateFileAAllergene(idx, 'allergeniPresence', e.target.value)}>
                                       <option value="Assente">Assente</option>
                                       <option value="Presente (Linee separate)">Presente (Linee separate)</option>
                                       <option value="Presente (Stessa linea)">Presente (Stessa linea)</option>
                                       <option value="Presente (Altro reparto)">Presente (Altro reparto)</option>
                                    </select>
                                 </td>
                                 <td className="py-4 px-2">
                                    <select className="w-full p-2 rounded-lg border border-slate-200 shadow-sm text-xs font-bold bg-white outline-none focus:border-blue-500" 
                                            value={qualData.fileA.allergeniGestione[idx] || 'Non Applicabile'} 
                                            onChange={(e) => updateFileAAllergene(idx, 'allergeniGestione', e.target.value)}>
                                       <option value="Non Applicabile">Non Applicabile</option>
                                       <option value="Separazione Temporale">Separazione Temporale</option>
                                       <option value="Separazione Spaziale">Separazione Spaziale</option>
                                       <option value="Sanificazione Validata">Sanificazione Validata</option>
                                    </select>
                                 </td>
                                 <td className="py-4 px-2">
                                    <input type="text" className="w-full p-2 rounded-lg border border-slate-200 shadow-sm text-xs font-bold bg-white outline-none focus:border-blue-500" placeholder="Specificare note..." value={qualData.fileA.allergeniNotes?.[idx] || ''} onChange={(e) => updateFileAAllergene(idx, 'allergeniNotes', e.target.value)} />
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
                </div>
              )}

              {activeTab === 'FILE_B' && (
                <div className="space-y-12 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6"><Truck size={48} className="text-slate-900"/><h3 className="text-5xl font-black uppercase tracking-tighter text-slate-900">{t('tabDichiarazioneB')}</h3></div>
                    <button onClick={saveProgress} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm"><Save size={16} /> {t('save')}</button>
                  </div>
                  <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-200 shadow-inner space-y-6">
                     <div className="flex items-center justify-between border-b-2 border-slate-200 pb-4 mb-6">
                       <h4 className="text-2xl font-black uppercase text-slate-800">Gestione Processi e Flussi Logistici</h4>
                       {isTestUser && <button onClick={addGlobalImpegnoB} className="text-blue-600 bg-blue-50 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-blue-100 flex items-center gap-2"><Plus size={14}/> Aggiungi Parametro</button>}
                     </div>
                     
                     {globalConfig.impegniB.map((imp) => (
                       <label key={imp.id} className="flex items-start gap-5 cursor-pointer group bg-white p-8 rounded-3xl shadow-sm border-2 border-transparent hover:border-emerald-400 transition-all relative">
                          <input type="checkbox" className="mt-1.5 w-6 h-6 rounded text-emerald-600 focus:ring-emerald-500 shrink-0" checked={qualData.fileB[imp.id] || false} onChange={(e)=>updateFileB(imp.id, e.target.checked)} />
                          <div className="w-full">
                            {isTestUser ? (
                               <>
                                 <input className="text-lg font-black text-slate-900 block mb-2 w-full border-b border-slate-200 focus:border-blue-500 outline-none pb-1" value={imp['title_'+lang] || imp.title_it || imp.title} onChange={e => updateGlobalImpegnoB(imp.id, 'title_'+lang, e.target.value)} placeholder="Titolo parametro..." />
                                 <textarea className="text-sm font-bold text-slate-500 w-full border rounded-lg p-2 focus:border-blue-500 outline-none min-h-[60px]" value={imp['desc_'+lang] || imp.desc_it || imp.desc} onChange={e => updateGlobalImpegnoB(imp.id, 'desc_'+lang, e.target.value)} placeholder="Descrizione parametro..." />
                               </>
                            ) : (
                               <>
                                 <span className="text-lg font-black text-slate-900 block mb-2">{imp['title_'+lang] || imp.title_it || imp.title}</span>
                                 <span className="text-sm font-bold text-slate-500 leading-relaxed block text-justify">{imp['desc_'+lang] || imp.desc_it || imp.desc}</span>
                               </>
                            )}
                          </div>
                          {isTestUser && <button onClick={(e) => { e.preventDefault(); removeGlobalImpegnoB(imp.id); }} className="absolute right-4 top-4 text-red-300 hover:text-red-600 bg-red-50 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>}
                       </label>
                     ))}

                  </div>
                </div>
              )}

              {activeTab === 'FILE_C' && (
                <div className="space-y-12 animate-in fade-in duration-300">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                    <div className="flex items-center gap-6"><Database size={48} className="text-slate-900"/><h3 className="text-5xl font-black uppercase tracking-tighter text-slate-900">{t('tabProdotti')}</h3></div>
                    <div className="flex items-center gap-3">
                      <button onClick={saveProgress} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-sm"><Save size={16} /> {t('save')}</button>
                      <button onClick={addFileCRow} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"><Plus size={18}/> Aggiungi Articolo</button>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-[3rem] p-8 shadow-inner border border-slate-200 overflow-x-auto">
                     <table className="w-full text-left min-w-[800px]">
                        <thead className="text-[10px] uppercase font-black text-slate-400">
                           <tr><th className="p-4">Tipologia</th><th className="p-4">Denominazione</th><th className="p-4">Origine</th><th className="p-4">Shelf Life</th><th className="p-4 text-center">Rimuovi</th></tr>
                        </thead>
                        <tbody className="text-slate-900 space-y-2">
                           {(qualData.fileC || []).map(p => (
                              <tr key={p.id} className="bg-white border-b-8 border-slate-50">
                                 <td className="p-2 rounded-l-2xl"><select className="w-full p-4 rounded-xl border border-slate-100 shadow-sm bg-white font-bold text-xs" value={p.tipologia || 'Materia prima'} onChange={(e)=>updateFileC(p.id, 'tipologia', e.target.value)}><option>Materia prima</option><option>Prodotto Finito</option><option>Imballaggio</option><option>Altro</option></select></td>
                                 <td className="p-2"><input className="w-full p-4 rounded-xl border border-slate-100 shadow-sm bg-white font-bold text-xs" value={p.denominazione || ''} onChange={(e)=>updateFileC(p.id, 'denominazione', e.target.value)} placeholder="Nome commerciale" /></td>
                                 <td className="p-2"><input className="w-full p-4 rounded-xl border border-slate-100 shadow-sm bg-white font-bold text-xs" value={p.origine || ''} onChange={(e)=>updateFileC(p.id, 'origine', e.target.value)} placeholder="Paese di origine" /></td>
                                 <td className="p-2"><input className="w-full p-4 rounded-xl border border-slate-100 shadow-sm bg-white font-bold text-xs" value={p.shelfLife || ''} onChange={(e)=>updateFileC(p.id, 'shelfLife', e.target.value)} placeholder="Es. 24 mesi" /></td>
                                 <td className="p-2 rounded-r-2xl text-center"><button onClick={()=>removeFileCRow(p.id)} className="text-slate-300 hover:text-red-500 bg-slate-50 p-3 rounded-xl transition-colors"><Trash2 size={20}/></button></td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
                </div>
              )}

              {activeTab === 'PDF' && (
                <div className="animate-in zoom-in duration-500 space-y-16">
                  <div className="flex items-center gap-6"><FileSearch size={48} /><h3 className="text-5xl font-black uppercase tracking-tighter">REPORT UFFICIALE</h3><div className="h-1 flex-1 bg-slate-100 rounded-full" /></div>
                  <div className="max-w-4xl mx-auto bg-white border-[20px] border-slate-50 p-12 shadow-2xl rounded-[3rem] overflow-hidden">
                    <div className="text-center border-b-4 border-slate-900 pb-10 mb-10">
                      {masterLogo && <img src={masterLogo} className="h-20 mx-auto mb-6 object-contain" />}
                      <h1 className="text-2xl font-black uppercase">International Food Pivot Srl</h1>
                      <p className="text-[10px] font-bold opacity-60">Piazza Duca Dâ€™Aosta, 12 | 20124 Milan â€“ Italy</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 mb-12 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500">{t('pdfPlaceLabel')}</label>
                        <input className="w-full p-3 rounded-xl border border-slate-200 shadow-sm font-bold text-sm outline-none focus:ring-2 ring-emerald-500" value={qualData.pdfPlace || ''} onChange={e => setQualData(p => ({...p, pdfPlace: e.target.value}))} placeholder="Es. Milano" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500">{t('pdfDateLabel')}</label>
                        <input type="date" className="w-full p-3 rounded-xl border border-slate-200 shadow-sm font-bold text-sm outline-none focus:ring-2 ring-emerald-500" value={qualData.pdfDate || ''} onChange={e => setQualData(p => ({...p, pdfDate: e.target.value}))} />
                      </div>
                    </div>

                    <div className="space-y-8">
                      <section className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100"><h5 className="text-[10px] font-black uppercase mb-2 text-emerald-600">Identificazione fornitore in esame:</h5><p className="text-xl font-black uppercase tracking-tighter text-emerald-900">{qualData.anagrafica.rs || currentSupplier?.name}</p></section>
                      <button onClick={generatePDF} className="bg-slate-900 text-white px-20 py-8 rounded-[2rem] font-black text-2xl uppercase tracking-tighter hover:bg-emerald-600 transition-all shadow-2xl flex items-center gap-6 mx-auto"><Download size={40} strokeWidth={3}/> SCARICA PDF UFFICIALE</button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'SIGNED' && (
                <div className="animate-in fade-in duration-500 space-y-16">
                  <div className="flex items-center gap-6 text-slate-900"><Signature size={48} /><h3 className="text-5xl font-black uppercase tracking-tighter text-slate-900">{t('tabSignedPdf')}</h3></div>
                  <div className="max-w-2xl mx-auto bg-slate-50 p-16 rounded-[4rem] border-4 border-dashed border-slate-300 flex flex-col items-center justify-center gap-8 shadow-inner text-center">
                    
                    {qualData.signedDossier?.fileData ? (
                       <div className="flex flex-col items-center animate-in zoom-in duration-300 w-full">
                         {/* BOX DI DOWNLOAD */}
                         <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border-2 border-emerald-200 flex flex-col items-center gap-4 hover:border-emerald-500 transition-all w-full max-w-sm mx-auto">
                            <FileSignature size={64} className="text-emerald-600"/>
                            <span className="font-black text-sm text-slate-900 truncate w-full px-4">{qualData.signedDossier.fileName}</span>
                            
                            {/* LINK FORZATO AL DOWNLOAD */}
                            <a 
                              href={qualData.signedDossier.fileData} 
                              download={qualData.signedDossier.fileName || "dossier_firmato.pdf"} 
                              className="bg-emerald-600 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 shadow-md transition-all flex items-center gap-2"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download size={16}/> CLICCA PER SCARICARE
                            </a>
                         </div>
                       </div>
                    ) : (
                      <div className="bg-white p-8 rounded-full shadow-xl">
                        <UploadCloud size={64} className="text-slate-300"/>
                      </div>
                    )}
                    
                    {!qualData.signedDossier?.fileData && (
                      <div>
                        <h4 className="text-xl font-black uppercase mb-2 text-slate-900">Nessun file caricato</h4>
                        <p className="text-xs text-slate-500 font-bold px-10">Stampa il dossier dal Tab 7, firmalo, scansionalo e ricaricalo qui per completare ufficialmente l'iter di qualifica.</p>
                      </div>
                    )}
                    
                    {qualData.signedDossier?.fileData ? (
                       <div className="flex flex-col gap-4 justify-center mt-6 w-full max-w-sm">
                         <button onClick={saveProgress} className="bg-blue-600 text-white font-black text-sm hover:bg-blue-700 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl shadow-xl transition-all uppercase w-full">
                           <Save size={20}/> Salva il Dossier
                         </button>
                         <button onClick={deleteSignedFile} className="text-red-700 font-black text-sm hover:bg-red-200 flex items-center justify-center gap-3 bg-red-100 px-6 py-3 rounded-2xl border border-red-300 shadow-sm transition-all uppercase">
                           <Trash2 size={18}/> Elimina file
                         </button>
                       </div>
                    ) : (
                      <div className="relative overflow-hidden inline-block mt-4">
                        <button className="bg-slate-900 text-white px-12 py-5 rounded-3xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl pointer-events-none flex items-center gap-3">
                          <FileUp size={20} /> Seleziona PDF Firmato
                        </button>
                        <input type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleSignedUpload} />
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
