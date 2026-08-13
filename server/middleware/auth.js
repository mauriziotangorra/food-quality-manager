const jwt = require('jsonwebtoken');

const DEV_FALLBACK_SECRET = 'dev-only-insecure-fallback-secret';

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET non impostato in .env: uso una chiave di sviluppo non sicura.');
}

const JWT_SECRET = process.env.JWT_SECRET || DEV_FALLBACK_SECRET;
const TOKEN_TTL = '12h';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// Valida il Bearer token e popola req.auth. 401 se mancante/non valido.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Autenticazione richiesta' });
  }

  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessione non valida o scaduta' });
  }
}

// Da usare dopo requireAuth: consente solo agli admin.
function requireAdmin(req, res, next) {
  if (!req.auth || req.auth.role !== 'admin') {
    return res.status(403).json({ error: 'Accesso riservato agli amministratori' });
  }
  next();
}

// Da usare dopo requireAuth: consente admin oppure il fornitore proprietario di :supplierId.
function requireOwnerOrAdmin(req, res, next) {
  if (!req.auth) return res.status(401).json({ error: 'Autenticazione richiesta' });
  const { supplierId } = req.params;
  if (req.auth.role === 'admin') return next();
  if (req.auth.role === 'supplier' && req.auth.supplierId === supplierId) return next();
  return res.status(403).json({ error: 'Non autorizzato per questo fornitore' });
}

module.exports = { signToken, requireAuth, requireAdmin, requireOwnerOrAdmin, JWT_SECRET, TOKEN_TTL };
