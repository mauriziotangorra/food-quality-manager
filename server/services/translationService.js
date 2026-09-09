const { GoogleGenAI, Type } = require('@google/genai');
const { isQuotaError, QUOTA_MESSAGE_IT, extractCleanGeminiMessage } = require('../utils/aiErrorMessage');

// Stesso modello/client usati per l'estrazione AI dei documenti
// (aiExtractionService.js): un client separato qui perche' il caso d'uso
// (testo -> testo, niente file) e' diverso, ma stessa configurazione via env.
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const LANG_NAMES = { it: 'Italian', en: 'English', fr: 'French', es: 'Spanish' };
const ALL_LANGS = ['it', 'en', 'fr', 'es'];

let cachedClient = null;
function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!cachedClient) cachedClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return cachedClient;
}

function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function isCloudTranslateConfigured() {
  return Boolean(process.env.GOOGLE_TRANSLATE_API_KEY);
}

// isQuotaError (da ../utils/aiErrorMessage, condivisa con
// aiExtractionService.js) decide se vale la pena tentare il fallback su
// Google Cloud Translation: Gemini incapsula l'errore originale dentro
// e.message come stringa, quindi si riconosce l'esaurimento quota dal
// testo — non elegantissimo, ma è tutto quello che il SDK espone. Altri
// errori (prompt non valido, rete, ecc.) NON attivano il fallback:
// propagano normalmente, così un bug reale non viene mascherato da un
// secondo servizio che "sembra" funzionare.

function isAiConfigured() {
  return isGeminiConfigured() || isCloudTranslateConfigured();
}

// Traduce in UNA sola chiamata AI un intero BATCH di elementi (non un
// elemento alla volta): il piano gratuito di Gemini ha una quota giornaliera
// di richieste molto bassa (es. 20/giorno), quindi tradurre 40+ dichiarazioni
// con una chiamata a testa la esaurisce quasi subito. `items` e'
// [{ id, fields: {campo: testo, ...} }] nella lingua sorgente; ritorna
// { id: {campo: testo tradotto, ...}, ... } — solo per gli id/campi che
// avevano davvero del testo da tradurre.
async function translateBatchViaGemini(items, sourceLang, targetLang) {
  const usable = items
    .map((it) => ({
      id: it.id,
      fields: Object.fromEntries(Object.entries(it.fields || {}).filter(([, v]) => (v || '').toString().trim())),
    }))
    .filter((it) => Object.keys(it.fields).length);
  if (!usable.length) return {};

  const ai = getGeminiClient();
  if (!ai) {
    const err = new Error('Funzionalità di traduzione AI non configurata (GEMINI_API_KEY mancante).');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const schema = {
    type: Type.OBJECT,
    properties: Object.fromEntries(
      usable.map((it) => [
        it.id,
        { type: Type.OBJECT, properties: Object.fromEntries(Object.keys(it.fields).map((k) => [k, { type: Type.STRING }])) },
      ])
    ),
  };

  const payload = Object.fromEntries(usable.map((it) => [it.id, it.fields]));

  const prompt = `Translate the following JSON from ${LANG_NAMES[sourceLang] || sourceLang} to ${LANG_NAMES[targetLang] || targetLang}.

This is a batch of ${usable.length} separate items from a food-industry supplier-qualification / compliance form (declarations, quality parameters, questionnaire questions, allergen names) — each top-level key is an independent item id, translate each one's fields independently. Keep regulation codes, standard names and acronyms unchanged (e.g. "Reg. CE 178/2002", "HACCP", "ACCREDIA", "DPR 327/80", "BRCGS", "GMP") and translate only the surrounding language. Preserve line breaks and punctuation. Return a JSON object with the SAME top-level item-id keys and the SAME nested field keys as the input, containing only the translated values — never add, remove, or rename any key.

INPUT:
${JSON.stringify(payload, null, 2)}`;

  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json', responseSchema: schema },
    });
  } catch (e) {
    if (isQuotaError(e.message)) {
      const err = new Error(QUOTA_MESSAGE_IT);
      err.code = 'AI_QUOTA_EXCEEDED';
      throw err;
    }
    const err = new Error(`Errore durante la chiamata al modello di traduzione AI: ${extractCleanGeminiMessage(e.message) || e.message}`);
    err.code = 'AI_REQUEST_FAILED';
    throw err;
  }

  const text = response?.text;
  if (!text) {
    const err = new Error('Il modello di traduzione AI non ha restituito alcun risultato.');
    err.code = 'AI_EMPTY_RESPONSE';
    throw err;
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    const err = new Error('Risposta di traduzione AI non interpretabile.');
    err.code = 'AI_PARSE_ERROR';
    throw err;
  }
}

// Fallback quando Gemini esaurisce la quota: Google Cloud Translation è un
// prodotto separato (API v2, endpoint REST semplice con sola API key, niente
// service account) con una quota gratuita mensile molto più ampia (500.000
// caratteri/mese) e non condivide alcun limite con Gemini. L'API v2 non
// capisce JSON strutturato come Gemini: si "appiattisce" ogni campo di ogni
// elemento in un array ordinato di stringhe, si manda in UNA chiamata (il
// parametro `q` accetta un array), e si "riappiattisce" il risultato usando
// lo stesso ordine.
async function translateBatchViaCloudTranslate(items, sourceLang, targetLang) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    const err = new Error('Google Cloud Translation non configurata (GOOGLE_TRANSLATE_API_KEY mancante).');
    err.code = 'CLOUD_TRANSLATE_NOT_CONFIGURED';
    throw err;
  }

  const usable = items
    .map((it) => ({
      id: it.id,
      fields: Object.fromEntries(Object.entries(it.fields || {}).filter(([, v]) => (v || '').toString().trim())),
    }))
    .filter((it) => Object.keys(it.fields).length);
  if (!usable.length) return {};

  const order = [];
  const texts = [];
  for (const it of usable) {
    for (const [fieldKey, value] of Object.entries(it.fields)) {
      order.push({ id: it.id, fieldKey });
      texts.push(value);
    }
  }

  let json;
  try {
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: texts, source: sourceLang, target: targetLang, format: 'text' }),
    });
    json = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(`Errore Google Cloud Translation: ${json?.error?.message || res.statusText}`);
      err.code = 'CLOUD_TRANSLATE_REQUEST_FAILED';
      throw err;
    }
  } catch (e) {
    if (e.code) throw e;
    const err = new Error(`Errore durante la chiamata a Google Cloud Translation: ${e.message}`);
    err.code = 'CLOUD_TRANSLATE_REQUEST_FAILED';
    throw err;
  }

  const translations = json?.data?.translations || [];
  const result = {};
  order.forEach((o, idx) => {
    const translatedText = translations[idx]?.translatedText;
    if (translatedText === undefined) return;
    if (!result[o.id]) result[o.id] = {};
    result[o.id][o.fieldKey] = translatedText;
  });
  return result;
}

// Punto d'ingresso usato dal chiamante: prova Gemini, e SOLO se fallisce per
// quota esaurita (mai per altri errori) e Google Cloud Translation è
// configurata, ripete lo stesso batch lì invece di far fallire tutto —
// così una giornata di quota Gemini esaurita non blocca più le traduzioni.
async function translateBatch(items, sourceLang, targetLang) {
  if (isGeminiConfigured()) {
    try {
      return await translateBatchViaGemini(items, sourceLang, targetLang);
    } catch (e) {
      if (e.code === 'AI_QUOTA_EXCEEDED' && isCloudTranslateConfigured()) {
        console.warn(`⚠️  Quota Gemini esaurita, fallback su Google Cloud Translation (${sourceLang}->${targetLang}, ${items.length} elementi).`);
        return translateBatchViaCloudTranslate(items, sourceLang, targetLang);
      }
      throw e;
    }
  }
  if (isCloudTranslateConfigured()) {
    return translateBatchViaCloudTranslate(items, sourceLang, targetLang);
  }
  const err = new Error('Nessun servizio di traduzione configurato (GEMINI_API_KEY o GOOGLE_TRANSLATE_API_KEY mancanti).');
  err.code = 'AI_NOT_CONFIGURED';
  throw err;
}

// Dato langGroups = { it: {...campi...}, en: {...}, fr: {...}, es: {...} },
// determina la lingua sorgente (preferisce 'it' se ha contenuto, altrimenti
// la prima lingua non vuota) e quali lingue di destinazione sono
// completamente vuote (mai una lingua che ha gia' qualcosa, anche parziale).
// Non chiama l'AI: e' solo il calcolo, cosi' il chiamante puo' raggruppare
// tanti elementi per (sourceLang, targetLang) e tradurli in un solo batch
// invece di un elemento alla volta.
function planTranslation(langGroups) {
  const isGroupEmpty = (g) => !g || Object.values(g).every((v) => !(v || '').toString().trim());
  let sourceLang = null;
  for (const l of ALL_LANGS) {
    if (!isGroupEmpty(langGroups[l])) { sourceLang = l; break; }
  }
  if (!sourceLang) return { sourceLang: null, missing: [] };
  const missing = ALL_LANGS.filter((l) => l !== sourceLang && isGroupEmpty(langGroups[l]));
  return { sourceLang, missing };
}

/**
 * Translates an entire product spec object into the target language.
 * Leaves numeric values, codes, IDs, flags, and attachments untouched.
 */
async function translateSpecObject(spec, sourceLang = 'it', targetLang = 'en') {
  if (!spec || sourceLang === targetLang) return spec;
  if (!isAiConfigured()) return spec;

  const clone = JSON.parse(JSON.stringify(spec));
  const items = [];

  // Master
  if (clone.master?.nome) {
    items.push({ id: 'master', fields: { nome: clone.master.nome } });
  }

  // Section A
  if (clone.a) {
    const aFields = {};
    ['legalName', 'brand', 'claim', 'ingredients', 'allergensNote', 'batchDecode', 'intendedUse', 'storage', 'envLabel', 'packMode', 'producedIn'].forEach((f) => {
      if (clone.a[f]) aFields[f] = clone.a[f];
    });
    if (Object.keys(aFields).length) {
      items.push({ id: 'section_a', fields: aFields });
    }
  }

  // Section B (Chemical-physical)
  if (Array.isArray(clone.b)) {
    clone.b.forEach((row, idx) => {
      const bFields = {};
      if (row.p) bFields.p = row.p;
      if (row.limite) bFields.limite = row.limite;
      if (row.risultato) bFields.risultato = row.risultato;
      if (row.conforme) bFields.conforme = row.conforme;
      if (Object.keys(bFields).length) {
        items.push({ id: `b_${idx}`, fields: bFields });
      }
    });
  }

  // Section C (Nutritional table parameter names, if customized)
  if (Array.isArray(clone.c)) {
    clone.c.forEach((row, idx) => {
      if (row.p) {
        items.push({ id: `c_${idx}`, fields: { p: row.p } });
      }
    });
  }

  // Section D (Microbiological)
  if (Array.isArray(clone.d)) {
    clone.d.forEach((row, idx) => {
      const dFields = {};
      if (row.p) dFields.p = row.p;
      if (row.limite) dFields.limite = row.limite;
      if (row.risultato) dFields.risultato = row.risultato;
      if (row.conforme) dFields.conforme = row.conforme;
      if (Object.keys(dFields).length) {
        items.push({ id: `d_${idx}`, fields: dFields });
      }
    });
  }

  // Section E (Organoleptic)
  if (clone.e) {
    const eFields = {};
    ['consistency', 'aroma', 'look', 'taste'].forEach((f) => {
      if (clone.e[f]) eFields[f] = clone.e[f];
    });
    if (Object.keys(eFields).length) {
      items.push({ id: 'section_e', fields: eFields });
    }
  }

  // Section G (GMO)
  if (clone.g) {
    const gFields = {};
    if (clone.g.statement) gFields.statement = clone.g.statement;
    if (clone.g.containsGmo) gFields.containsGmo = clone.g.containsGmo;
    if (Object.keys(gFields).length) {
      items.push({ id: 'section_g', fields: gFields });
    }
  }

  if (!items.length) return clone;

  const result = await translateBatch(items, sourceLang, targetLang);

  // Apply translations back to clone
  if (result.master?.nome) clone.master.nome = result.master.nome;

  if (result.section_a && clone.a) {
    Object.assign(clone.a, result.section_a);
  }

  if (Array.isArray(clone.b)) {
    clone.b.forEach((row, idx) => {
      if (result[`b_${idx}`]) Object.assign(row, result[`b_${idx}`]);
    });
  }

  if (Array.isArray(clone.c)) {
    clone.c.forEach((row, idx) => {
      if (result[`c_${idx}`]?.p) row.p = result[`c_${idx}`].p;
    });
  }

  if (Array.isArray(clone.d)) {
    clone.d.forEach((row, idx) => {
      if (result[`d_${idx}`]) Object.assign(row, result[`d_${idx}`]);
    });
  }

  if (result.section_e && clone.e) {
    Object.assign(clone.e, result.section_e);
  }

  if (result.section_g && clone.g) {
    Object.assign(clone.g, result.section_g);
  }

  return clone;
}

/**
 * Translates an entire qualData object into the target language.
 */
async function translateQualDataObject(qualData, sourceLang = 'it', targetLang = 'en') {
  if (!qualData || sourceLang === targetLang) return qualData;
  if (!isAiConfigured()) return qualData;

  const clone = JSON.parse(JSON.stringify(qualData));
  const items = [];

  // File A: allergen custom notes
  if (clone.fileA?.allergens) {
    Object.entries(clone.fileA.allergens).forEach(([allId, row]) => {
      const allFields = {};
      if (row.note) allFields.note = row.note;
      if (row.presenza) allFields.presenza = row.presenza;
      if (row.tracce) allFields.tracce = row.tracce;
      if (Object.keys(allFields).length) {
        items.push({ id: `allergen_${allId}`, fields: allFields });
      }
    });
  }

  // File D: questionnaire answers & notes
  if (clone.fileD?.answers) {
    Object.entries(clone.fileD.answers).forEach(([qId, ans]) => {
      const qFields = {};
      if (ans.notes) qFields.notes = ans.notes;
      if (ans.answer) qFields.answer = ans.answer;
      if (Object.keys(qFields).length) {
        items.push({ id: `question_${qId}`, fields: qFields });
      }
    });
  }

  // File C: product rows
  if (Array.isArray(clone.fileC)) {
    clone.fileC.forEach((p, idx) => {
      const pFields = {};
      if (p.tipologia) pFields.tipologia = p.tipologia;
      if (p.denominazione) pFields.denominazione = p.denominazione;
      if (p.origine) pFields.origine = p.origine;
      if (p.shelfLife) pFields.shelfLife = p.shelfLife;
      if (Object.keys(pFields).length) {
        items.push({ id: `filec_${idx}`, fields: pFields });
      }
    });
  }

  // Raw materials
  if (Array.isArray(clone.rawMaterials)) {
    clone.rawMaterials.forEach((m, idx) => {
      const rmFields = {};
      if (m.name) rmFields.name = m.name;
      if (m.frequency) rmFields.frequency = m.frequency;
      if (m.notes) rmFields.notes = m.notes;
      if (Object.keys(rmFields).length) {
        items.push({ id: `rm_${idx}`, fields: rmFields });
      }
    });
  }

  // Food Fraud & Food Defense
  if (clone.foodFraudDefense) {
    const ffdFields = {};
    if (clone.foodFraudDefense.foodFraud?.appliesTo) {
      ffdFields.foodFraudAppliesTo = clone.foodFraudDefense.foodFraud.appliesTo;
    }
    if (clone.foodFraudDefense.foodDefense?.appliesTo) {
      ffdFields.foodDefenseAppliesTo = clone.foodDefense.foodDefense.appliesTo;
    }
    if (Object.keys(ffdFields).length) {
      items.push({ id: 'food_fraud_defense', fields: ffdFields });
    }
  }

  if (!items.length) return clone;

  const result = await translateBatch(items, sourceLang, targetLang);

  // Apply translations back to clone
  if (clone.fileA?.allergens) {
    Object.entries(clone.fileA.allergens).forEach(([allId, row]) => {
      if (result[`allergen_${allId}`]) {
        Object.assign(row, result[`allergen_${allId}`]);
      }
    });
  }

  if (clone.fileD?.answers) {
    Object.entries(clone.fileD.answers).forEach(([qId, ans]) => {
      if (result[`question_${qId}`]) {
        Object.assign(ans, result[`question_${qId}`]);
      }
    });
  }

  if (Array.isArray(clone.fileC)) {
    clone.fileC.forEach((p, idx) => {
      if (result[`filec_${idx}`]) {
        Object.assign(p, result[`filec_${idx}`]);
      }
    });
  }

  if (Array.isArray(clone.rawMaterials)) {
    clone.rawMaterials.forEach((m, idx) => {
      if (result[`rm_${idx}`]) {
        Object.assign(m, result[`rm_${idx}`]);
      }
    });
  }

  if (clone.foodFraudDefense && result.food_fraud_defense) {
    if (result.food_fraud_defense.foodFraudAppliesTo && clone.foodFraudDefense.foodFraud) {
      clone.foodFraudDefense.foodFraud.appliesTo = result.food_fraud_defense.foodFraudAppliesTo;
    }
    if (result.food_fraud_defense.foodDefenseAppliesTo && clone.foodFraudDefense.foodDefense) {
      clone.foodFraudDefense.foodDefense.appliesTo = result.food_fraud_defense.foodDefenseAppliesTo;
    }
  }

  return clone;
}

module.exports = {
  translateBatch,
  planTranslation,
  isAiConfigured,
  ALL_LANGS,
  translateSpecObject,
  translateQualDataObject,
};
