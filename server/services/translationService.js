const { GoogleGenAI, Type } = require('@google/genai');

// Stesso modello/client usati per l'estrazione AI dei documenti
// (aiExtractionService.js): un client separato qui perche' il caso d'uso
// (testo -> testo, niente file) e' diverso, ma stessa configurazione via env.
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const LANG_NAMES = { it: 'Italian', en: 'English', fr: 'French', es: 'Spanish' };
const ALL_LANGS = ['it', 'en', 'fr', 'es'];

let cachedClient = null;
function getClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!cachedClient) cachedClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return cachedClient;
}

function isAiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

// Traduce in UNA sola chiamata AI un intero BATCH di elementi (non un
// elemento alla volta): il piano gratuito di Gemini ha una quota giornaliera
// di richieste molto bassa (es. 20/giorno), quindi tradurre 40+ dichiarazioni
// con una chiamata a testa la esaurisce quasi subito. `items` e'
// [{ id, fields: {campo: testo, ...} }] nella lingua sorgente; ritorna
// { id: {campo: testo tradotto, ...}, ... } — solo per gli id/campi che
// avevano davvero del testo da tradurre.
async function translateBatch(items, sourceLang, targetLang) {
  const usable = items
    .map((it) => ({
      id: it.id,
      fields: Object.fromEntries(Object.entries(it.fields || {}).filter(([, v]) => (v || '').toString().trim())),
    }))
    .filter((it) => Object.keys(it.fields).length);
  if (!usable.length) return {};

  const ai = getClient();
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
    const err = new Error(`Errore durante la chiamata al modello di traduzione AI: ${e.message}`);
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

module.exports = { translateBatch, planTranslation, isAiConfigured, ALL_LANGS };
