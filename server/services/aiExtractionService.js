const fs = require('fs');
const { GoogleGenAI, Type } = require('@google/genai');

// Modello Gemini usato per la lettura documenti: multimodale (PDF nativo +
// immagini), rapido ed economico rispetto ai modelli "pro". Configurabile
// via env senza toccare il codice.
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

// Gemini legge nativamente PDF (incluse scansioni, via OCR interno) e immagini
// come "inlineData". Non supporta Office (.doc/.xls) come binario grezzo:
// per quei formati l'estrazione AI viene semplicemente saltata lato route
// (il file resta comunque allegato normalmente).
const SUPPORTED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

let cachedClient = null;
function getClient() {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!cachedClient) cachedClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return cachedClient;
}

function isAiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function isSupportedMimeType(mimeType) {
  return SUPPORTED_MIME_TYPES.has(mimeType);
}

// Schemi di risposta per tipo di documento: forzano Gemini a rispondere con
// JSON che ricalca esattamente i campi del form (AP 05.1.1), cosi' il client
// puo' mapparli 1:1 senza bisogno di parsing libero o euristiche di testo.
const STRING_FIELDS = (names) => Object.fromEntries(names.map((n) => [n, { type: Type.STRING }]));

const TABLE_ROW_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    p: { type: Type.STRING }, limite: { type: Type.STRING }, risultato: { type: Type.STRING },
    conforme: { type: Type.STRING }
  }
};

const RESPONSE_SCHEMAS = {
  logistica: {
    type: Type.OBJECT,
    properties: {
      uvc: { type: Type.OBJECT, properties: STRING_FIELDS(['ean', 'pesoNetto', 'pesoSgocc', 'tara', 'pesoLordo', 'l', 'p', 'h']) },
      box: { type: Type.OBJECT, properties: STRING_FIELDS(['itf', 'pz', 'tara', 'pesoLordo', 'l', 'p', 'h']) },
      pallet: { type: Type.OBJECT, properties: STRING_FIELDS(['tipo', 'cLayer', 'layers', 'totC', 'alt', 'pesoTot']) }
    }
  },
  microbiologici: {
    type: Type.OBJECT,
    properties: { rows: { type: Type.ARRAY, items: TABLE_ROW_SCHEMA } }
  },
  chimici: {
    type: Type.OBJECT,
    properties: { rows: { type: Type.ARRAY, items: TABLE_ROW_SCHEMA } }
  },
  etichetta: {
    type: Type.OBJECT,
    properties: {
      ingredients: { type: Type.STRING },
      nutrition: {
        type: Type.OBJECT,
        properties: STRING_FIELDS(['energyKj', 'energyKcal', 'fat', 'satFat', 'carbs', 'sugar', 'fiber', 'protein', 'salt'])
      },
      allergens: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            presenza: { type: Type.STRING, enum: ['Sì (Ingrediente)', 'Sì (Derivato/Additivo)'] }
          }
        }
      }
    }
  },
  tecnica: {
    type: Type.OBJECT,
    properties: {
      ...STRING_FIELDS([
        'legalName', 'brand', 'claim', 'ingredients', 'allergensNote', 'tmc',
        'producedIn', 'batchDecode', 'intendedUse', 'storage', 'envLabel', 'packMode'
      ]),
      nutrition: {
        type: Type.OBJECT,
        properties: STRING_FIELDS(['energyKj', 'energyKcal', 'fat', 'satFat', 'carbs', 'sugar', 'fiber', 'protein', 'salt'])
      },
      organoleptic: { type: Type.OBJECT, properties: STRING_FIELDS(['consistency', 'aroma', 'look', 'taste']) },
      gmo: {
        type: Type.OBJECT,
        properties: {
          containsGmo: { type: Type.STRING },
          statement: { type: Type.STRING }
        }
      }
    }
  },
  firma: {
    type: Type.OBJECT,
    properties: {
      hasSignature: { type: Type.STRING, enum: ['Sì', 'No'] }
    }
  }
};

const BASE_PROMPTS = {
  logistica:
    "Sei un assistente che legge schede tecniche logistiche di prodotti alimentari (peso, dimensioni e composizione di confezione UVC, cartone e pallet). " +
    "Estrai i valori dal documento allegato e rispondi SOLO con un oggetto JSON conforme allo schema fornito. " +
    'Se un valore non è presente nel documento, lascialo come stringa vuota "". Non inventare valori.',
  microbiologici:
    "Sei un assistente che legge rapporti di analisi microbiologiche di prodotti alimentari. " +
    "Estrai ogni parametro testato (es. Salmonella, Listeria monocytogenes, Escherichia coli, Carica microbica totale, ecc.), il limite di riferimento, il risultato misurato, " +
    'e se il risultato è conforme al limite ("Sì" o "No"). Rispondi SOLO con un oggetto JSON conforme allo schema fornito. ' +
    "Se un campo non è determinabile, lascialo come stringa vuota. Non inventare dati.",
  chimici:
    "Sei un assistente che legge rapporti di analisi chimico-fisiche di prodotti alimentari. " +
    "Estrai ogni parametro testato (es. pH, umidità, attività dell'acqua, metalli pesanti, residui, ecc.), il limite di riferimento, il risultato misurato, " +
    'e se il risultato è conforme al limite ("Sì" o "No"). Rispondi SOLO con un oggetto JSON conforme allo schema fornito. ' +
    "Se un campo non è determinabile, lascialo come stringa vuota. Non inventare dati.",
  etichetta:
    "Sei un assistente che legge l'etichetta alimentare di un prodotto. Estrai: " +
    "1) il testo completo dell'elenco ingredienti così come scritto in etichetta; " +
    "2) i valori della tabella nutrizionale per 100g/100ml per le voci indicate nello schema (energia in kJ, energia in kcal, grassi, di cui saturi, carboidrati, di cui zuccheri, fibre, proteine, sale); " +
    '3) per ciascuno degli allergeni della lista fornita qui sotto, indica se è presente come ingrediente ("Sì (Ingrediente)") o come derivato/additivo ("Sì (Derivato/Additivo)") SOLO se ne hai trovato evidenza chiara in etichetta; non includere nell\'elenco gli allergeni assenti. ' +
    "Usa esattamente l'id fornito per ciascun allergene nella risposta.\n" +
    "Lista allergeni noti (id: nome): {{ALLERGEN_LIST}}\n" +
    "Rispondi SOLO con un oggetto JSON conforme allo schema fornito. Se un campo non è determinabile, lascialo come stringa vuota o omettilo. Non inventare dati.",
  tecnica:
    "Sei un assistente che legge la scheda tecnica generale di un prodotto alimentare (documento commerciale/tecnico fornito dal fornitore, non l'etichetta e non un rapporto di laboratorio). Estrai, solo se presenti nel documento: " +
    "denominazione legale, marchio/brand, claim commerciale, elenco ingredienti, eventuale nota allergeni, TMC/shelf life, luogo di produzione, decodifica del lotto, modalità d'uso e consumo, condizioni di conservazione, etichetta ambientale, modalità di confezionamento; " +
    "i valori della tabella nutrizionale per 100g/100ml (energia in kJ e kcal, grassi, di cui saturi, carboidrati, di cui zuccheri, fibre, proteine, sale); " +
    "le caratteristiche organolettiche (consistenza, aroma, aspetto/colore, sapore); " +
    'e la dichiarazione OGM (se il prodotto contiene OGM: "Sì" o "No", più eventuale testo della dichiarazione). ' +
    "NON estrarre parametri di analisi microbiologica o chimico-fisica anche se presenti nel documento: quelli si caricano da altri documenti dedicati. " +
    "Rispondi SOLO con un oggetto JSON conforme allo schema fornito. Se un campo non è determinabile, lascialo come stringa vuota o omettilo. Non inventare dati.",
  firma:
    "Sei un assistente che controlla se un documento PDF caricato come 'dossier di qualifica firmato' contiene effettivamente una firma. " +
    "Cerca in tutte le pagine una firma manoscritta, un timbro aziendale, o una firma digitale/elettronica (es. blocco di firma di DocuSign, Adobe Sign o simili). " +
    'Rispondi SOLO con un oggetto JSON conforme allo schema fornito: hasSignature vale "Sì" se hai trovato una firma o un timbro chiaramente visibile su almeno una pagina, "No" altrimenti o se non sei sicuro.'
};

function buildPrompt(docType, allergens) {
  if (docType !== 'etichetta') return BASE_PROMPTS[docType];
  const list = (allergens || []).map((a) => `${a.id}: ${a.it || a.en || a.type || ''}`).join('; ') || '(nessuno)';
  return BASE_PROMPTS.etichetta.replace('{{ALLERGEN_LIST}}', list);
}

// Legge il file dal disco e chiede a Gemini di estrarne i campi strutturati
// per il docType indicato. Non scrive nulla: il chiamante decide se/come
// applicare i valori restituiti (pensato per un flusso "suggerimento + revisione").
async function extractDocumentData({ docType, filePath, mimeType, allergens }) {
  const ai = getClient();
  if (!ai) {
    const err = new Error('Funzionalità AI non configurata (GEMINI_API_KEY mancante).');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const schema = RESPONSE_SCHEMAS[docType];
  if (!schema) {
    const err = new Error("Tipo di documento non supportato per l'estrazione AI.");
    err.code = 'UNSUPPORTED_DOC_TYPE';
    throw err;
  }

  if (!isSupportedMimeType(mimeType)) {
    const err = new Error('Formato file non supportato per la lettura AI (solo PDF e immagini).');
    err.code = 'UNSUPPORTED_MIME';
    throw err;
  }

  const fileBuffer = await fs.promises.readFile(filePath);
  const base64Data = fileBuffer.toString('base64');
  const prompt = buildPrompt(docType, allergens);

  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64Data } }
        ]
      }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema
      }
    });
  } catch (e) {
    const err = new Error(`Errore durante la chiamata al modello AI: ${e.message}`);
    err.code = 'AI_REQUEST_FAILED';
    throw err;
  }

  const text = response?.text;
  if (!text) {
    const err = new Error('Il modello AI non ha restituito alcun risultato.');
    err.code = 'AI_EMPTY_RESPONSE';
    throw err;
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    const err = new Error('Risposta AI non interpretabile.');
    err.code = 'AI_PARSE_ERROR';
    throw err;
  }
}

module.exports = { extractDocumentData, isAiConfigured, isSupportedMimeType };
