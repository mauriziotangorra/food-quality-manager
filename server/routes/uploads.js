const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || '50', 10);
const SCOPE_RE = /^[a-zA-Z0-9_-]+$/;

function scopeDir(scope) {
  return path.join(UPLOAD_ROOT, scope);
}

// Un fornitore può caricare solo nel proprio scope; l'admin può caricare ovunque
// (incluso "global", riservato al logo aziendale).
async function checkScopeAccess(req, res, next) {
  const { scope } = req.params;
  if (!SCOPE_RE.test(scope)) return res.status(400).json({ error: 'Scope non valido' });

  if (req.auth.role === 'admin') return next();

  if (req.auth.role === 'supplier' && req.auth.supplierId === scope) return next();

  return res.status(403).json({ error: 'Non autorizzato a caricare file in questo scope' });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = scopeDir(req.params.scope);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .slice(0, 60);
    cb(null, `${crypto.randomUUID()}-${base}${ext}`);
  }
});

const upload = multer({ storage, limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 } });

// POST /api/uploads/:scope - :scope è l'id fornitore, oppure "global" (solo admin)
router.post('/:scope', requireAuth, checkScopeAccess, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: `Il file supera il limite massimo di ${MAX_UPLOAD_MB} MB` });
      }
      console.error('POST /api/uploads/:scope', err);
      return res.status(500).json({ error: 'Errore nel caricamento del file' });
    }

    if (!req.file) return res.status(400).json({ error: 'Nessun file ricevuto' });

    const url = `/uploads/${req.params.scope}/${req.file.filename}`;
    res.status(201).json({ url, name: req.file.originalname, size: req.file.size });
  });
});

// DELETE /api/uploads?path=/uploads/<scope>/<file> - rimozione best-effort
router.delete('/', requireAuth, async (req, res) => {
  try {
    const relPath = req.query.path;
    if (!relPath || typeof relPath !== 'string' || !relPath.startsWith('/uploads/')) {
      return res.status(400).json({ error: 'Path non valido' });
    }

    const parts = relPath.replace(/^\/uploads\//, '').split('/');
    const scope = parts[0];
    if (!SCOPE_RE.test(scope)) return res.status(400).json({ error: 'Path non valido' });

    if (req.auth.role !== 'admin' && !(req.auth.role === 'supplier' && req.auth.supplierId === scope)) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    const absPath = path.resolve(UPLOAD_ROOT, ...parts);
    if (!absPath.startsWith(path.resolve(UPLOAD_ROOT))) {
      return res.status(400).json({ error: 'Path non valido' });
    }

    await fs.promises.unlink(absPath).catch((e) => {
      if (e.code !== 'ENOENT') throw e;
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/uploads', err);
    res.status(500).json({ error: "Errore nell'eliminazione del file" });
  }
});

module.exports = router;
