// Controllo di completezza obbligatorio per le sezioni "nuove" (Documentazione
// Qualifica, Materie Prime, Food Fraud/Food Defense, HACCP/Autocontrollo):
// ognuna richiede documenti allegati, e per Food Fraud/Defense e HACCP il
// campo "Applicabile a" è obbligatorio non appena c'è almeno un file.
//
// Il blocco si applica SOLO al pulsante "Save" di ciascuna di queste 4 tab —
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

export function getQualificationDocIssues(doc) {
  const issues = [];
  if (!doc.name) issues.push('nome mancante');
  if (!doc.files || doc.files.length === 0) issues.push('nessun file caricato');
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

export function checkQualificationDocsCompleteness(qualData) {
  const lines = [];
  (qualData.qualificationDocs || []).forEach((d, idx) => {
    const issues = getQualificationDocIssues(d);
    if (issues.length) lines.push(`"${d.name || `Documento #${idx + 1}`}": ${issues.join(', ')}.`);
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
