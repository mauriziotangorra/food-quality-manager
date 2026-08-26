const pool = require('../db');

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
  const [impegniC] = await pool.query('SELECT id, it, en, fr, es, section, allow_attachment FROM impegni_c ORDER BY sort_order ASC');
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
    await pool.withTransaction(async (conn) => {
      if (Array.isArray(t.impegniA)) {
        await replaceSimpleList(conn, 'impegni_a', ['id', 'it', 'en', 'fr', 'es', 'sort_order'], t.impegniA);
      }
      if (Array.isArray(t.impegniB)) {
        await replaceSimpleList(
          conn,
          'impegni_b',
          ['id', 'title_it', 'desc_it', 'title_en', 'desc_en', 'title_fr', 'desc_fr', 'title_es', 'desc_es', 'sort_order'],
          t.impegniB
        );
      }
      if (Array.isArray(t.impegniC)) {
        await replaceSimpleList(
          conn,
          'impegni_c',
          ['id', 'it', 'en', 'fr', 'es', 'section', 'allow_attachment', 'sort_order'],
          t.impegniC.map((item) => ({ ...item, allow_attachment: item.allow_attachment ? 1 : 0 }))
        );
      }
      if (Array.isArray(t.allergeni)) {
        await replaceSimpleList(conn, 'allergens', ['id', 'it', 'en', 'fr', 'es', 'sort_order'], t.allergeni);
      }
    });
  }

  return getGlobalSettings();
}

module.exports = { getGlobalSettings, saveGlobalSettings };
