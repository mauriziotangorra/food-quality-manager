// Controllo di completezza obbligatorio per le sezioni "nuove" (Materie
// Prime, Food Fraud/Food Defense, HACCP/Autocontrollo): ognuna richiede
// documenti allegati, e per Food Fraud/Defense e HACCP il campo
// "Applicabile a" è obbligatorio non appena c'è almeno un file.
//
// Il blocco si applica SOLO al pulsante "Save" di ciascuna di queste tab —
// non al salvataggio condiviso (QualificationPage), altrimenti un fornitore
// non potrebbe salvare nemmeno una modifica ad Anagrafica finché Food Fraud/
// Defense (una sezione fissa, incompleta di default per ogni fornitore) non
// è completa. Ogni tab valida solo la propria sezione.

const ALERT_HEADLINE =
  'Documentazione incompleta: indicare la famiglia di prodotto/applicazione e completare i documenti richiesti prima di procedere.';

export function getRawMaterialIssues(material) {
  const issues = [];
  if (!material.name) issues.push('nome mancante');
  if (!material.technicalSheet) issues.push('scheda tecnica mancante');
  if (!material.analysisReports || material.analysisReports.length === 0) issues.push('analisi/rapporti di prova mancanti');
  if (!material.riskAssessment || material.riskAssessment.length === 0) issues.push('gestione e valutazione del rischio mancante');
  if (!material.frequency) issues.push('frequenza delle analisi mancante');
  return issues;
}

export function getFoodFraudDefenseIssues(section) {
  const issues = [];
  const hasFiles = section.files && section.files.length > 0;
  if (!hasFiles) issues.push('nessun file caricato');
  if (hasFiles && !section.appliesTo) issues.push('campo "Applicabile a" obbligatorio');
  return issues;
}

const HACCP_SLOT_LABELS = {
  manualExtract: 'Estratto Manuale HACCP',
  flowChart: 'Diagramma di Flusso Produttivo',
  prp: 'PRP',
  oprpCcp: 'OPRP / CCP / Misure di Controllo',
};

export function getHaccpSlotIssues(files) {
  const issues = [];
  (files || []).forEach((f, idx) => {
    if (!f.appliesTo) issues.push(`file "${f.name || `#${idx + 1}`}" senza campo "Applicabile a"`);
  });
  return issues;
}

function buildResult(lines) {
  if (!lines.length) return { ok: true, message: null };
  return { ok: false, message: `${ALERT_HEADLINE}\n\n${lines.join('\n')}` };
}

export function checkRawMaterialsCompleteness(qualData) {
  const lines = [];
  (qualData.rawMaterials || []).forEach((m, idx) => {
    const issues = getRawMaterialIssues(m);
    if (issues.length) lines.push(`"${m.name || `Materia Prima #${idx + 1}`}": ${issues.join(', ')}.`);
  });
  return buildResult(lines);
}

export function checkFoodFraudDefenseCompleteness(qualData) {
  const lines = [];
  const ffd = qualData.foodFraudDefense || {};
  const labels = { foodFraud: 'Food Fraud', foodDefense: 'Food Defense' };
  for (const key of Object.keys(labels)) {
    const issues = getFoodFraudDefenseIssues(ffd[key] || {});
    if (issues.length) lines.push(`${labels[key]}: ${issues.join(', ')}.`);
  }
  return buildResult(lines);
}

export function checkHaccpCompleteness(qualData) {
  const lines = [];
  const haccp = qualData.haccp || {};
  for (const key of Object.keys(HACCP_SLOT_LABELS)) {
    const issues = getHaccpSlotIssues(haccp[key]);
    if (issues.length) lines.push(`${HACCP_SLOT_LABELS[key]}: ${issues.join(', ')}.`);
  }
  return buildResult(lines);
}

// ---------------------------------------------------------------------
// Riepilogo pre-invio (tab "Dossier Firmato"): raccoglie gli stessi tipi di
// controllo qui sopra più quelli delle tab senza un proprio pulsante "Save"
// bloccante (Anagrafica, Contatti, Certificazioni, Dichiarazioni A/B/C,
// Prodotti), in un unico elenco per sezione. È SOLO un avviso: non impedisce
// il caricamento del dossier firmato, perché non tutte le sezioni si
// applicano a ogni fornitore (es. MOCA/Packaging), quindi un blocco rigido
// finirebbe per impedire l'invio a chi non ha nulla da mettere in quelle
// sezioni. MOCA/Packaging è per questo escluso dal riepilogo.
// ---------------------------------------------------------------------

const DEPTS = ['sales', 'marketing', 'qualita', 'amministrazione', 'customer', 'logistica'];
const DEPT_LABELS = {
  sales: 'Commerciale', marketing: 'Marketing', qualita: 'Qualità',
  amministrazione: 'Amministrazione', customer: 'Customer Service', logistica: 'Logistica',
};

function section(tabId, labelKey, lines) {
  return lines.length ? { tabId, labelKey, issues: lines } : null;
}

export function getFullChecklist(qualData, globalConfig) {
  const gc = globalConfig || {};
  const sections = [];

  const a = qualData.anagrafica || {};
  const missingA = ['rs', 'piva', 'sede', 'citta', 'provincia', 'cap', 'nazione'].filter((k) => !a[k]);
  sections.push(section('ANAGRAFICA', 'tabAnagrafica', missingA.length ? [`campi anagrafici mancanti: ${missingA.join(', ')}.`] : []));

  const contatti = qualData.contatti || {};
  const incompleteDepts = DEPTS.filter((d) => !contatti[d]?.nome || !contatti[d]?.email).map((d) => DEPT_LABELS[d]);
  sections.push(section('CONTATTI', 'tabContatti', incompleteDepts.length ? [`contatti incompleti: ${incompleteDepts.join(', ')}.`] : []));

  const missingCerts = (qualData.certificazioni || []).filter((c) => c.type && !c.fileUrl).map((c) => c.type);
  sections.push(section('CERTIFICAZIONI', 'tabCertificazioni', missingCerts.length ? [`documenti mancanti: ${missingCerts.join(', ')}.`] : []));

  const fileA = qualData.fileA || {};
  const impegniA = gc.impegniA || [];
  const uncheckedA = impegniA.filter((_, idx) => !fileA.impegni?.[idx]).map((imp) => imp.it || imp.en || `#${imp.id}`);
  const fileALines = [];
  if (uncheckedA.length) fileALines.push(`impegni non confermati: ${uncheckedA.length} su ${impegniA.length}.`);
  if (!fileA.allergenManagementPlan?.length) fileALines.push('piano di gestione allergeni mancante.');
  if (!fileA.contaminationRiskAssessment?.length) fileALines.push('valutazione del rischio di contaminazione mancante.');
  sections.push(section('FILE_A', 'tabDichiarazioneA', fileALines));

  const fileB = qualData.fileB || {};
  const impegniB = gc.impegniB || [];
  const uncheckedB = impegniB.filter((imp) => !fileB[imp.id]).map((imp) => imp.title_it || imp.title_en || `#${imp.id}`);
  sections.push(section('FILE_B', 'tabDichiarazioneB', uncheckedB.length ? [`impegni non confermati: ${uncheckedB.length} su ${impegniB.length}.`] : []));

  const declAnswers = qualData.fileD?.answers || {};
  const impegniC = gc.impegniC || [];
  const unansweredC = impegniC.filter((imp) => !declAnswers[imp.id]?.answer).map((imp) => imp.it || imp.en || `#${imp.id}`);
  sections.push(section('FILE_D', 'tabDichiarazioneC', unansweredC.length ? [`domande senza risposta: ${unansweredC.length} su ${impegniC.length}.`] : []));

  const missingProducts = (qualData.fileC || []).filter((p) => !p.denominazione).length;
  sections.push(section('FILE_C', 'tabProdotti', missingProducts ? [`${missingProducts} prodotto/i senza denominazione.`] : []));

  const rmLines = [];
  (qualData.rawMaterials || []).forEach((m, idx) => {
    const issues = getRawMaterialIssues(m);
    if (issues.length) rmLines.push(`"${m.name || `Materia Prima #${idx + 1}`}": ${issues.join(', ')}.`);
  });
  sections.push(section('RAW_MATERIALS', 'tabMateriePrime', rmLines));

  const ffdLines = [];
  const ffd = qualData.foodFraudDefense || {};
  const ffdLabels = { foodFraud: 'Food Fraud', foodDefense: 'Food Defense' };
  for (const key of Object.keys(ffdLabels)) {
    const issues = getFoodFraudDefenseIssues(ffd[key] || {});
    if (issues.length) ffdLines.push(`${ffdLabels[key]}: ${issues.join(', ')}.`);
  }
  sections.push(section('FOOD_FRAUD_DEFENSE', 'tabFoodFraudDefense', ffdLines));

  const haccpLines = [];
  const haccp = qualData.haccp || {};
  for (const key of Object.keys(HACCP_SLOT_LABELS)) {
    const issues = getHaccpSlotIssues(haccp[key]);
    if (issues.length) haccpLines.push(`${HACCP_SLOT_LABELS[key]}: ${issues.join(', ')}.`);
  }
  sections.push(section('HACCP', 'tabHaccp', haccpLines));

  return sections.filter(Boolean);
}
