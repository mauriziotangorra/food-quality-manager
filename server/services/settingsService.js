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

// Riempie con l'AI le sole lingue completamente vuote di ogni item della
// lista (mai una lingua che ha gia' qualcosa, anche parziale). Se l'AI non è
// configurata (niente GEMINI_API_KEY) o una singola traduzione fallisce,
// l'item viene lasciato così com'era: la traduzione è un miglioramento
// automatico, mai un requisito per poter salvare.
async function autoTranslateList(items, adapterKey) {
  if (!translationService.isAiConfigured() || !Array.isArray(items) || !items.length) return items;
  const adapter = LANG_ADAPTERS[adapterKey];
  const out = [];
  for (const item of items) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const groups = await translationService.fillMissingTranslations(adapter.toGroups(item));
      out.push(adapter.fromGroups(item, groups));
    } catch (e) {
      console.warn(`⚠️  Traduzione automatica saltata per un elemento (${adapterKey}, id=${item.id}): ${e.message}`);
      out.push(item);
    }
  }
  return out;
}

// Applica un patch parziale: 'logo' e 'templates' sono indipendenti, come
// nel comportamento originale (AdminPage salva solo templates, HomePage
// salva solo logo — mai insieme). hasOwnProperty distingue "non inviato"
// da "inviato esplicitamente null" (HomePage usa null per rimuovere il logo).
async function saveGlobalSettings(patch) {
  if (Object.prototype.hasOwnProperty.call(patch, 'logo')) {
    await pool.query('UPDATE app_settings SET logo_url = ? WHERE id = 1', [patch.logo]);
  }

  if (patch.templates) {
    const t = patch.templates;

    // Traduzione automatica PRIMA della transazione DB: sono chiamate AI
    // esterne, potenzialmente lente — non deve tenere aperta una transazione
    // mentre aspetta Gemini.
    const [translatedA, translatedB, translatedC, translatedAllergeni] = await Promise.all([
      Array.isArray(t.impegniA) ? autoTranslateList(t.impegniA, 'simple') : t.impegniA,
      Array.isArray(t.impegniB) ? autoTranslateList(t.impegniB, 'impegniB') : t.impegniB,
      Array.isArray(t.impegniC) ? autoTranslateList(t.impegniC, 'impegniC') : t.impegniC,
      Array.isArray(t.allergeni) ? autoTranslateList(t.allergeni, 'simple') : t.allergeni,
    ]);

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

  return getGlobalSettings();
}

// "Seeder" per i dati GIA' presenti in DB (es. su un ambiente dove le
// dichiarazioni sono state inserite prima che esistesse la traduzione
// automatica): rilegge ogni tabella, traduce le sole lingue mancanti con
// fillMissingTranslations e riscrive solo gli item effettivamente cambiati.
// Pensata per essere invocata on-demand da un pulsante admin (mai al boot:
// puo' fare molte chiamate AI in sequenza, troppo lenta/fragile da avere nel
// percorso di avvio del server).
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
    const adapter = LANG_ADAPTERS[job.adapterKey];
    let updated = 0;
    for (const row of rows) {
      let groups;
      try {
        // eslint-disable-next-line no-await-in-loop
        groups = await translationService.fillMissingTranslations(adapter.toGroups(row));
      } catch (e) {
        console.warn(`⚠️  Traduzione mancante saltata per ${job.table} id=${row.id}: ${e.message}`);
        continue;
      }
      const updatedRow = adapter.fromGroups(row, groups);
      const changedCols = job.columns.filter((c) => c !== 'id' && updatedRow[c] !== row[c]);
      if (!changedCols.length) continue;
      // eslint-disable-next-line no-await-in-loop
      await pool.query(
        `UPDATE ${job.table} SET ${changedCols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
        [...changedCols.map((c) => updatedRow[c]), row.id]
      );
      updated += 1;
    }
    summary[job.table] = { total: rows.length, updated };
  }
  return summary;
}

module.exports = { getGlobalSettings, saveGlobalSettings, translateMissingInStore };
