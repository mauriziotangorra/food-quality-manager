const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const { extractDocumentData, isAiConfigured } = require('../services/aiExtractionService');

const router = express.Router();

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const MAX_AI_FILE_MB = parseInt(process.env.MAX_AI_FILE_MB || '15', 10);
const SCOPE_RE = /^[a-zA-Z0-9_-]+$/;

const MIME_BY_EXT = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
};

// I tipi di upload di AP 07.2.1 (Product Specification) che hanno un mapping
// verso campi del form; "foto" (foto prodotto) resta un upload semplice,
// senza estrazione AI (nessun campo strutturato da leggere da una foto generica).
// "firma" non estrae campi: verifica solo se il dossier firmato caricato
// sembra contenere una firma (riepilogo pre-invio, tab Dossier Firmato).
const DOC_TYPES = new Set(['logistica', 'microbiologici', 'chimici', 'etichetta', 'tecnica', 'firma', 'tutto']);

// Risolve un fileUrl ("/uploads/<scope>/<file>") nel path assoluto sul disco,
// verificando che resti dentro UPLOAD_ROOT e che il richiedente possa
// accedere a quello scope — stessa logica di autorizzazione già usata da
// DELETE /api/uploads (un fornitore può leggere solo i propri file).
function resolveUploadPath(req, fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('/uploads/')) return null;
  const parts = fileUrl.replace(/^\/uploads\//, '').split('/');
  const scope = parts[0];
  if (!SCOPE_RE.test(scope)) return null;
  if (req.auth.role !== 'admin' && !(req.auth.role === 'supplier' && req.auth.supplierId === scope)) return null;

  const absPath = path.resolve(UPLOAD_ROOT, ...parts);
  if (!absPath.startsWith(path.resolve(UPLOAD_ROOT) + path.sep)) return null;
  return absPath;
}

// POST /api/ai/extract - legge un file già caricato in /uploads e ne estrae i
// campi strutturati tramite Gemini, per pre-compilare (in sola revisione lato
// client, nessuna scrittura qui) la scheda tecnica prodotto AP 07.2.1.
router.post('/extract', requireAuth, async (req, res) => {
  try {
    if (!isAiConfigured()) {
      return res.status(503).json({
        error: 'Funzionalità AI non configurata (GEMINI_API_KEY mancante).',
        code: 'AI_NOT_CONFIGURED'
      });
    }

    const { fileUrl, docType, allergens } = req.body || {};
    if (!DOC_TYPES.has(docType)) {
      return res.status(400).json({ error: 'Tipo di documento non valido.' });
    }

    const absPath = resolveUploadPath(req, fileUrl);
    if (!absPath) return res.status(400).json({ error: 'File non valido o non autorizzato.' });

    const stat = await fs.promises.stat(absPath).catch(() => null);
    if (!stat || !stat.isFile()) return res.status(404).json({ error: 'File non trovato.' });
    if (stat.size > MAX_AI_FILE_MB * 1024 * 1024) {
      return res.status(413).json({ error: `Il file supera il limite di ${MAX_AI_FILE_MB} MB per la lettura AI.` });
    }

    const ext = path.extname(absPath).toLowerCase();
    const mimeType = MIME_BY_EXT[ext];
    if (!mimeType) {
      return res.status(415).json({
        error: 'Formato non supportato per la lettura AI (solo PDF e immagini JPG/PNG/WEBP).',
        code: 'UNSUPPORTED_MIME'
      });
    }

    const data = await extractDocumentData({
      docType,
      filePath: absPath,
      mimeType,
      allergens: Array.isArray(allergens) ? allergens : []
    });

    res.json({ ok: true, data });
  } catch (err) {
    console.error('POST /api/ai/extract', err);
    const status = err.code === 'AI_NOT_CONFIGURED' || err.code === 'AI_QUOTA_EXCEEDED' ? 503 : err.code ? 422 : 500;
    res.status(status).json({ error: err.message || "Errore durante l'analisi AI del documento.", code: err.code });
  }
});

module.exports = router;
