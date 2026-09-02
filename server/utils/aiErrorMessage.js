// Riconosce gli errori di quota/rate-limit esaurita nelle chiamate AI
// (Gemini, e con lo stesso pattern generalmente altre API Google) dal testo
// grezzo dell'errore — l'unico modo disponibile, perche' l'SDK incapsula
// l'intero payload JSON della risposta di errore dentro Error.message
// invece di esporre un campo strutturato (status code, quota id, ecc.).
// Usato ovunque una chiamata AI possa fallire, cosi' quel JSON grezzo non
// finisce mai per essere mostrato cosi' com'e' in un alert all'utente.
function isQuotaError(message) {
  const msg = message || '';
  return msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429') || /quota/i.test(msg);
}

const QUOTA_MESSAGE_IT = 'Quota giornaliera del modello AI esaurita. Riprova più tardi o abilita la fatturazione sul progetto Gemini.';

// Anche per errori NON di quota, Error.message dell'SDK Gemini e' spesso
// l'intero payload JSON della risposta di errore stringificato
// ({"error":{"code":...,"message":"...","status":"...","details":[...]}})
// invece del solo messaggio leggibile. Qui si prova a fare il parse e a
// estrarre SOLO error.message — se non e' JSON (o non ha quella forma),
// ritorna null e il chiamante usa il testo originale cosi' com'e'.
function extractCleanGeminiMessage(rawMessage) {
  if (!rawMessage) return null;
  try {
    const parsed = JSON.parse(rawMessage);
    if (parsed?.error?.message) return parsed.error.message;
  } catch {
    // Non era JSON nella forma attesa: nessun problema, si usa il testo originale.
  }
  return null;
}

module.exports = { isQuotaError, QUOTA_MESSAGE_IT, extractCleanGeminiMessage };
