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

// Traduce un gruppo di campi (es. {text: '...', section: '...'} oppure
// {title: '...', desc: '...'}) da una lingua sorgente a UNA lingua di
// destinazione, in una sola chiamata AI. Ignora i campi vuoti (non li manda
// al modello, non li include nel risultato). Non scrive nulla: il chiamante
// decide se/come applicare il risultato.
async function translateFieldGroup(fields, sourceLang, targetLang) {
  const nonEmpty = Object.fromEntries(
    Object.entries(fields || {}).filter(([, v]) => (v || '').toString().trim())
  );
  if (!Object.keys(nonEmpty).length) return {};

  const ai = getClient();
  if (!ai) {
    const err = new Error('Funzionalità di traduzione AI non configurata (GEMINI_API_KEY mancante).');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const schema = {
    type: Type.OBJECT,
    properties: Object.fromEntries(Object.keys(nonEmpty).map((k) => [k, { type: Type.STRING }])),
  };

  const prompt = `Translate the following JSON field values from ${LANG_NAMES[sourceLang] || sourceLang} to ${LANG_NAMES[targetLang] || targetLang}.

This text comes from a food-industry supplier-qualification / compliance form (declarations, quality parameters, questionnaire questions, allergen names). Keep regulation codes, standard names and acronyms unchanged (e.g. "Reg. CE 178/2002", "HACCP", "ACCREDIA", "DPR 327/80", "BRCGS", "GMP", "OGM/GMO" per the target language convention) and translate only the surrounding language. Preserve line breaks and punctuation. Return a JSON object with the SAME keys as the input, containing only the translated values — never add, remove, or rename keys.

INPUT:
${JSON.stringify(nonEmpty, null, 2)}`;

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
// la prima lingua non vuota) e traduce SOLO i gruppi-lingua completamente
// vuoti — non tocca mai una lingua che ha gia' un valore, anche parziale
// (mai sovrascrivere una traduzione/testo che qualcuno ha gia' scritto).
async function fillMissingTranslations(langGroups) {
  const isGroupEmpty = (g) => !g || Object.values(g).every((v) => !(v || '').toString().trim());

  let sourceLang = null;
  for (const l of ALL_LANGS) {
    if (!isGroupEmpty(langGroups[l])) { sourceLang = l; break; }
  }
  if (!sourceLang) return langGroups; // niente da cui tradurre, nessuna lingua ha contenuto

  const missing = ALL_LANGS.filter((l) => l !== sourceLang && isGroupEmpty(langGroups[l]));
  if (!missing.length) return langGroups;

  const result = { ...langGroups };
  for (const target of missing) {
    // eslint-disable-next-line no-await-in-loop
    const translated = await translateFieldGroup(langGroups[sourceLang], sourceLang, target);
    result[target] = { ...langGroups[target], ...translated };
  }
  return result;
}

module.exports = { translateFieldGroup, fillMissingTranslations, isAiConfigured };
