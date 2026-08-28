// ------------------------------------------------------------------
//  CLIENT API - Sostituisce l'SDK Firebase (auth + firestore)
//  Il client comunica con il backend Node.js/Express + MySQL.
//  In sviluppo Vite inoltra /api e /uploads verso http://localhost:5000.
//  Per un deployment separato è possibile impostare __api_base
//  (es. "http://localhost:5000") prima del caricamento del bundle.
// ------------------------------------------------------------------

const API_BASE =
  typeof __api_base !== 'undefined' && __api_base ? __api_base : '';

const TOKEN_STORAGE_KEY = 'fqm_token';

let authToken = null;
try {
  authToken = localStorage.getItem(TOKEN_STORAGE_KEY) || null;
} catch {
  authToken = null;
}

let onUnauthorized = null;

// Chiamato dal AuthProvider per tenere il modulo API sincronizzato col token corrente.
export function setAuthToken(token) {
  authToken = token || null;
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* storage non disponibile: token resta solo in memoria */
  }
}

export function getAuthToken() {
  return authToken;
}

// Callback invocata quando una richiesta risponde 401 (sessione scaduta/non valida).
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData) && options.body) {
    headers['Content-Type'] = 'application/json';
  }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && onUnauthorized) onUnauthorized();

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.error || `Errore API (${res.status})`);
    if (body.code) error.code = body.code;
    throw error;
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Fornitori (pubblici, solo id/name/status) + impostazioni globali
  bootstrap: () => request('/api/bootstrap'),

  // Autenticazione
  loginAdmin: (username, password) =>
    request('/api/auth/login-admin', { method: 'POST', body: JSON.stringify({ username, password }) }),
  loginSupplier: (code, area) =>
    request('/api/auth/login-supplier', { method: 'POST', body: JSON.stringify({ code, area }) }),
  me: () => request('/api/auth/me'),

  // Upload file (multipart) - scope è l'id fornitore oppure "global" (solo admin)
  uploadFile: (scope, file) => {
    const form = new FormData();
    form.append('file', file);
    return request(`/api/uploads/${encodeURIComponent(scope)}`, { method: 'POST', body: form });
  },
  deleteUpload: (url) => request(`/api/uploads?path=${encodeURIComponent(url)}`, { method: 'DELETE' }),

  // Lettura AI di un file già caricato (Tecnica / AP 05.1.1): estrae i campi
  // strutturati per il pre-riempimento del form, senza scrivere nulla lato
  // server. docType: 'logistica' | 'microbiologici' | 'chimici' | 'etichetta'.
  extractDocumentData: (fileUrl, docType, allergens) =>
    request('/api/ai/extract', { method: 'POST', body: JSON.stringify({ fileUrl, docType, allergens }) }),

  // Diagnostica SMTP (solo admin): invia una email di test all'indirizzo indicato.
  sendTestEmail: (to) => request('/api/email/test', { method: 'POST', body: JSON.stringify({ to }) }),

  // Impostazioni globali (logo + templates)
  getSettings: () => request('/api/settings'),
  saveSettings: (data) =>
    request('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Qualifiche fornitore (qualData + productSpecs)
  getQualifications: (supplierId) =>
    request(`/api/qualifications/${encodeURIComponent(supplierId)}`),
  saveQualifications: (supplierId, data) =>
    request(`/api/qualifications/${encodeURIComponent(supplierId)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // Fornitori (CRUD admin)
  getSuppliers: () => request('/api/suppliers'),
  createSupplier: (data) =>
    request('/api/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id, data) =>
    request(`/api/suppliers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteSupplier: (id) =>
    request(`/api/suppliers/${encodeURIComponent(id)}`, { method: 'DELETE' })
};
