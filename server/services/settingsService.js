const pool = require('../db');
const translationService = require('./translationService');

// Assembla le impostazioni globali (logo + template dichiarazioni/allergeni)
// dalle tabelle normalizzate, nella STESSA forma JSON che il vecchio blob
// settings.setting_value restituiva — così i consumer (client, bootstrap)
// non cambiano. Usata sia da routes/settings.js che da routes/bootstrap.js
// per evitare che le due implementazioni si scollino.
async function getGlobalSettings() {
  const [appRows] = await pool.query('SELECT logo_url FROM app_settings WHERE id = 1');
  const logo = appRows.length ? appRows[0].logo_url : null;

  const [impegniA] = await pool.query('SELECT id, it, en, fr, es FROM impegni_a ORDER BY sort_order ASC');
  const [impegniB] = await pool.query(
    'SELECT id, title_it, desc_it, title_en, desc_en, title_fr, desc_fr, title_es, desc_es FROM impegni_b ORDER BY sort_order ASC'
  );
  const [impegniC] = await pool.query(
    'SELECT id, it, en, fr, es, section, section_en, section_fr, section_es, allow_attachment FROM impegni_c ORDER BY sort_order ASC'
  );
  const [allergeni] = await pool.query('SELECT id, it, en, fr, es FROM allergens ORDER BY sort_order ASC');

  return { logo, templates: { allergeni, impegniA, impegniB, impegniC } };
}

async function replaceSimpleList(conn, table, columns, items) {
  await conn.query(`DELETE FROM ${table}`);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const values = columns.map((c) => (c === 'sort_order' ? i : item[c] ?? ''));
    await conn.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      values
    );
  }
}

// --- Adattatori tra la forma "colonne piatte" (it/en/fr/es, o
// title_it/desc_it/...) usata dalle tabelle DB e la forma "gruppi per lingua"
// ({ it: {...campi}, en: {...}, ... }) su cui lavora translationService.
// Un solo posto dove sapere come sono fatte le colonne di ciascuna tabella.
const LANG_ADAPTERS = {
  simple: {
    toGroups: (item) => ({
      it: { text: item.it }, en: { text: item.en }, fr: { text: item.fr }, es: { text: item.es },
    }),
    fromGroups: (item, g) => ({
      ...item,
      it: g.it?.text ?? item.it, en: g.en?.text ?? item.en, fr: g.fr?.text ?? item.fr, es: g.es?.text ?? item.es,
    }),
  },
  impegniB: {
    toGroups: (item) => ({
      it: { title: item.title_it, desc: item.desc_it },
      en: { title: item.title_en, desc: item.desc_en },
      fr: { title: item.title_fr, desc: item.desc_fr },
      es: { title: item.title_es, desc: item.desc_es },
    }),
    fromGroups: (item, g) => ({
      ...item,
      title_it: g.it?.title ?? item.title_it, desc_it: g.it?.desc ?? item.desc_it,
      title_en: g.en?.title ?? item.title_en, desc_en: g.en?.desc ?? item.desc_en,
      title_fr: g.fr?.title ?? item.title_fr, desc_fr: g.fr?.desc ?? item.desc_fr,
      title_es: g.es?.title ?? item.title_es, desc_es: g.es?.desc ?? item.desc_es,
    }),
  },
  impegniC: {
    toGroups: (item) => ({
      it: { text: item.it, section: item.section },
      en: { text: item.en, section: item.section_en },
      fr: { text: item.fr, section: item.section_fr },
      es: { text: item.es, section: item.section_es },
    }),
    fromGroups: (item, g) => ({
      ...item,
      it: g.it?.text ?? item.it, section: g.it?.section ?? item.section,
      en: g.en?.text ?? item.en, section_en: g.en?.section ?? item.section_en,
      fr: g.fr?.text ?? item.fr, section_fr: g.fr?.section ?? item.section_fr,
      es: g.es?.text ?? item.es, section_es: g.es?.section ?? item.section_es,
    }),
  },
};

// Traduce con l'AI le sole lingue mancanti di una LISTA di elementi, in un
// numero MINIMO di chiamate: raggruppa tutti gli elementi che condividono la
// stessa coppia (lingua sorgente, lingua di destinazione) e li traduce
// insieme in una sola chiamata batch, invece di una chiamata per elemento —
// essenziale perché il piano gratuito di Gemini ha una quota giornaliera di
// richieste molto bassa (es. 20/giorno): 40 dichiarazioni con 1 chiamata a
// testa la esauriscono quasi subito, con questo raggruppamento bastano al
// più 3 chiamate (it→en, it→fr, it→es) per l'intera lista.
// Non tocca mai una lingua che ha gia' un valore, anche parziale. Se l'AI
// non è configurata o una chiamata batch fallisce (es. quota esaurita), gli
// elementi coinvolti restano così come erano — il salvataggio non deve MAI
// fallire per colpa della traduzione — e l'esito viene accumulato in
// `report` invece di sparire in un console.warn silenzioso.
async function batchTranslateItems(items, adapterKey, report) {
  const changedIds = new Set();
  if (!Array.isArray(items) || !items.length) return { items, changedIds };
  if (!translationService.isAiConfigured()) {
    report.notConfigured = true;
    return { items, changedIds };
  }

  const adapter = LANG_ADAPTERS[adapterKey];
  const groupsById = new Map(items.map((item) => [item.id, adapter.toGroups(item)]));

  // Raggruppa per (sourceLang, targetLang): stesso "verso" di traduzione =
  // stessa chiamata batch, indipendentemente da quanti elementi coinvolge.
  const buckets = new Map();
  for (const item of items) {
    const groups = groupsById.get(item.id);
    const { sourceLang, missing } = translationService.planTranslation(groups);
    if (!sourceLang || !missing.length) continue;
    for (const targetLang of missing) {
      const key = `${sourceLang}:${targetLang}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ id: item.id, fields: groups[sourceLang] });
    }
  }

  for (const [key, bucketItems] of buckets) {
    const [sourceLang, targetLang] = key.split(':');
    let result;
    try {
      // eslint-disable-next-line no-await-in-loop
      result = await translationService.translateBatch(bucketItems, sourceLang, targetLang);
    } catch (e) {
      console.warn(`⚠️  Traduzione batch saltata (${adapterKey}, ${sourceLang}->${targetLang}, ${bucketItems.length} elementi): ${e.message}`);
      report.failed += bucketItems.length;
      report.lastError = e.message;
      continue;
    }
    for (const { id } of bucketItems) {
      if (!result[id]) continue;
      const groups = groupsById.get(id);
      groups[targetLang] = { ...groups[targetLang], ...result[id] };
      changedIds.add(id);
    }
  }

  const outItems = items.map((item) => (changedIds.has(item.id) ? adapter.fromGroups(item, groupsById.get(item.id)) : item));
  return { items: outItems, changedIds };
}

// Applica un patch parziale: 'logo' e 'templates' sono indipendenti, come
// nel comportamento originale (AdminPage salva solo templates, HomePage
// salva solo logo — mai insieme). hasOwnProperty distingue "non inviato"
// da "inviato esplicitamente null" (HomePage usa null per rimuovere il logo).
async function saveGlobalSettings(patch) {
  if (Object.prototype.hasOwnProperty.call(patch, 'logo')) {
    await pool.query('UPDATE app_settings SET logo_url = ? WHERE id = 1', [patch.logo]);
  }

  let translationReport = null;
  if (patch.templates) {
    const t = patch.templates;

    // Traduzione automatica PRIMA della transazione DB: sono chiamate AI
    // esterne, potenzialmente lente — non deve tenere aperta una transazione
    // mentre aspetta Gemini.
    const report = { notConfigured: false, failed: 0, lastError: null };
    const [{ items: translatedA }, { items: translatedB }, { items: translatedC }, { items: translatedAllergeni }] = await Promise.all([
      Array.isArray(t.impegniA) ? batchTranslateItems(t.impegniA, 'simple', report) : { items: t.impegniA },
      Array.isArray(t.impegniB) ? batchTranslateItems(t.impegniB, 'impegniB', report) : { items: t.impegniB },
      Array.isArray(t.impegniC) ? batchTranslateItems(t.impegniC, 'impegniC', report) : { items: t.impegniC },
      Array.isArray(t.allergeni) ? batchTranslateItems(t.allergeni, 'simple', report) : { items: t.allergeni },
    ]);
    if (report.notConfigured || report.failed) translationReport = report;

    await pool.withTransaction(async (conn) => {
      if (Array.isArray(translatedA)) {
        await replaceSimpleList(conn, 'impegni_a', ['id', 'it', 'en', 'fr', 'es', 'sort_order'], translatedA);
      }
      if (Array.isArray(translatedB)) {
        await replaceSimpleList(
          conn,
          'impegni_b',
          ['id', 'title_it', 'desc_it', 'title_en', 'desc_en', 'title_fr', 'desc_fr', 'title_es', 'desc_es', 'sort_order'],
          translatedB
        );
      }
      if (Array.isArray(translatedC)) {
        await replaceSimpleList(
          conn,
          'impegni_c',
          ['id', 'it', 'en', 'fr', 'es', 'section', 'section_en', 'section_fr', 'section_es', 'allow_attachment', 'sort_order'],
          translatedC.map((item) => ({ ...item, allow_attachment: item.allow_attachment ? 1 : 0 }))
        );
      }
      if (Array.isArray(translatedAllergeni)) {
        await replaceSimpleList(conn, 'allergens', ['id', 'it', 'en', 'fr', 'es', 'sort_order'], translatedAllergeni);
      }
    });
  }

  const settings = await getGlobalSettings();
  // Non fa parte della "forma" storica di /api/settings (vedi commento in
  // getGlobalSettings): aggiunto solo qui, sulla risposta del salvataggio,
  // cosi' l'admin vede SUBITO se una lingua non e' stata tradotta e perche',
  // invece che scoprirlo solo cambiando lingua piu' tardi.
  if (translationReport) settings.translationWarning = translationReport;
  return settings;
}

// "Seeder" per i dati GIA' presenti in DB (es. su un ambiente dove le
// dichiarazioni sono state inserite prima che esistesse la traduzione
// automatica): rilegge ogni tabella, traduce le sole lingue mancanti in
// batch (vedi batchTranslateItems) e riscrive solo gli item effettivamente
// cambiati. Pensata per essere invocata on-demand da un pulsante admin (mai
// al boot: anche raggruppate, sono comunque chiamate AI, troppo
// lente/fragili da avere nel percorso di avvio del server).
async function translateMissingInStore() {
  if (!translationService.isAiConfigured()) {
    const err = new Error('Funzionalità di traduzione AI non configurata (GEMINI_API_KEY mancante).');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const jobs = [
    { table: 'impegni_a', adapterKey: 'simple', columns: ['id', 'it', 'en', 'fr', 'es'] },
    { table: 'impegni_b', adapterKey: 'impegniB', columns: ['id', 'title_it', 'desc_it', 'title_en', 'desc_en', 'title_fr', 'desc_fr', 'title_es', 'desc_es'] },
    { table: 'impegni_c', adapterKey: 'impegniC', columns: ['id', 'it', 'en', 'fr', 'es', 'section', 'section_en', 'section_fr', 'section_es'] },
    { table: 'allergens', adapterKey: 'simple', columns: ['id', 'it', 'en', 'fr', 'es'] },
  ];

  const summary = {};
  for (const job of jobs) {
    // eslint-disable-next-line no-await-in-loop
    const [rows] = await pool.query(`SELECT ${job.columns.join(', ')} FROM ${job.table}`);
    const report = { notConfigured: false, failed: 0, lastError: null };
    // eslint-disable-next-line no-await-in-loop
    const { items: updatedRows, changedIds } = await batchTranslateItems(rows, job.adapterKey, report);

    let updated = 0;
    const rowsById = new Map(rows.map((r) => [r.id, r]));
    for (const row of updatedRows) {
      if (!changedIds.has(row.id)) continue;
      const original = rowsById.get(row.id);
      const changedCols = job.columns.filter((c) => c !== 'id' && row[c] !== original[c]);
      if (!changedCols.length) continue;
      // eslint-disable-next-line no-await-in-loop
      await pool.query(
        `UPDATE ${job.table} SET ${changedCols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
        [...changedCols.map((c) => row[c]), row.id]
      );
      updated += 1;
    }
    summary[job.table] = { total: rows.length, updated, failed: report.failed, lastError: report.lastError };
  }
  return summary;
}

module.exports = { getGlobalSettings, saveGlobalSettings, translateMissingInStore };
