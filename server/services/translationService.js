const { GoogleGenAI, Type } = require('@google/genai');

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

// Usato SOLO per decidere se vale la pena tentare il fallback su Google
// Cloud Translation: Gemini incapsula l'errore originale dentro e.message
// come stringa (vedi catch in translateBatchViaGemini), quindi qui si
// riconosce l'esaurimento quota dal testo — non elegantissimo, ma è tutto
// quello che il SDK espone. Altri errori (prompt non valido, rete, ecc.)
// NON attivano il fallback: propagano normalmente, così un bug reale non
// viene mascherato da un secondo servizio che "sembra" funzionare.
function isQuotaError(e) {
  const msg = e?.message || '';
  return msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429') || /quota/i.test(msg);
}

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
      if (isQuotaError(e) && isCloudTranslateConfigured()) {
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

module.exports = { translateBatch, planTranslation, isAiConfigured, ALL_LANGS };
