const pool = require('../db');

const DEPTS = ['sales', 'marketing', 'qualita', 'amministrazione', 'customer', 'logistica'];
const FFD_SECTIONS = ['foodFraud', 'foodDefense'];
const RM_FILE_ROLES = ['analysisReports', 'riskAssessment'];
const MP_ROLES = ['moca', 'technicalSpecs', 'migrationTests', 'ppwr'];
const FILE_A_ROLES = ['allergenManagementPlan', 'contaminationRiskAssessment'];
const HACCP_ROLES = ['manualExtract', 'flowChart', 'prp', 'oprpCcp'];

// ------------------------------------------------------------------
// Rekeying idx <-> id stabile per fileA.impegni/fileD.impegni:
// nel vecchio blob queste risposte erano indicizzate per POSIZIONE
// nell'array di template (globalConfig.impegniA/C), non per id
// stabile. Le tabelle normalizzate usano l'id stabile del template; queste
// funzioni convertono in entrambe le direzioni usando l'ordine corrente
// (impegni_a/impegni_c.sort_order). Un indice fuori range
// (elemento di template ormai eliminato) viene semplicemente ignorato.
// ------------------------------------------------------------------

function checkedIdsFromBoolArray(orderedIds, boolArray) {
  const ids = [];
  if (!Array.isArray(boolArray)) return ids;
  boolArray.forEach((checked, idx) => {
    if (!checked) return;
    const id = orderedIds[idx];
    if (id === undefined) return;
    ids.push(id);
  });
  return ids;
}

function boolArrayFromCheckedIds(orderedIds, checkedIdSet) {
  return orderedIds.map((id) => checkedIdSet.has(id));
}

async function getTemplateOrder() {
  const [[impegniA], [impegniC]] = await Promise.all([
    pool.query('SELECT id FROM impegni_a ORDER BY sort_order ASC'),
    pool.query('SELECT id FROM impegni_c ORDER BY sort_order ASC')
  ]);
  return {
    impegniAIds: impegniA.map((r) => r.id),
    impegniCIds: impegniC.map((r) => r.id)
  };
}

// Assembla qualData dalle tabelle normalizzate, nella STESSA forma JSON del
// vecchio blob qualifications.qual_data — così le 12 tab React non cambiano.
// Ritorna null solo se il fornitore non ha assolutamente nessun dato (nessuna
// riga in nessuna delle 15 tabelle), per preservare il contratto "nessuna
// qualifica salvata" di GET /api/qualifications/:id.
async function getQualData(supplierId) {
  const { impegniAIds, impegniCIds } = await getTemplateOrder();

  const [
    [anagraficaRows], [contattiRows], [certRows],
    [impegniARows], [impegniBRows], [impegniCRows], [fileAFileRows],
    [prodottiRows], [docRows], [docFileRows],
    [rmRows], [rmFileRows],
    [ffdRows], [ffdFileRows],
    [mpFileRows],
    [haccpFileRows],
    [dossierRows]
  ] = await Promise.all([
    pool.query('SELECT * FROM qual_anagrafica WHERE supplier_id = ?', [supplierId]),
    pool.query('SELECT * FROM qual_contatti WHERE supplier_id = ?', [supplierId]),
    pool.query('SELECT * FROM qual_certificazioni WHERE supplier_id = ? ORDER BY sort_order ASC', [supplierId]),
    pool.query('SELECT impegno_id FROM qual_impegni_a WHERE supplier_id = ?', [supplierId]),
    pool.query('SELECT impegno_id FROM qual_impegni_b WHERE supplier_id = ?', [supplierId]),
    pool.query('SELECT impegno_id FROM qual_impegni_c WHERE supplier_id = ?', [supplierId]),
    pool.query('SELECT * FROM qual_file_a_files WHERE supplier_id = ? ORDER BY sort_order ASC', [supplierId]),
    pool.query('SELECT * FROM qual_prodotti WHERE supplier_id = ? ORDER BY sort_order ASC', [supplierId]),
    pool.query('SELECT * FROM qual_qualification_docs WHERE supplier_id = ? ORDER BY sort_order ASC', [supplierId]),
    pool.query('SELECT * FROM qual_qualification_doc_files WHERE supplier_id = ? ORDER BY sort_order ASC', [supplierId]),
    pool.query('SELECT * FROM qual_raw_materials WHERE supplier_id = ? ORDER BY sort_order ASC', [supplierId]),
    pool.query('SELECT * FROM qual_raw_material_files WHERE supplier_id = ? ORDER BY sort_order ASC', [supplierId]),
    pool.query('SELECT * FROM qual_food_fraud_defense WHERE supplier_id = ?', [supplierId]),
    pool.query('SELECT * FROM qual_food_fraud_defense_files WHERE supplier_id = ? ORDER BY sort_order ASC', [supplierId]),
    pool.query('SELECT * FROM qual_moca_packaging_files WHERE supplier_id = ? ORDER BY sort_order ASC', [supplierId]),
    pool.query('SELECT * FROM qual_haccp_files WHERE supplier_id = ? ORDER BY sort_order ASC', [supplierId]),
    pool.query('SELECT * FROM qual_dossier WHERE supplier_id = ?', [supplierId])
  ]);

  const hasAnyData = [
    anagraficaRows, contattiRows, certRows, impegniARows, impegniBRows, impegniCRows,
    fileAFileRows, prodottiRows, docRows, rmRows, ffdRows, mpFileRows, haccpFileRows, dossierRows
  ].some((rows) => rows.length > 0);
  if (!hasAnyData) return null;

  const a = anagraficaRows[0] || {};
  const anagrafica = {
    rs: a.rs || '', piva: a.piva || '', sede: a.sede || '', citta: a.citta || '',
    provincia: a.provincia || '', cap: a.cap || '', nazione: a.nazione || ''
  };

  const contattiByDept = Object.fromEntries(
    contattiRows.map((r) => [r.dept, { nome: r.nome || '', email: r.email || '', tel: r.tel || '' }])
  );
  const contatti = Object.fromEntries(
    DEPTS.map((d) => [d, contattiByDept[d] || { nome: '', email: '', tel: '' }])
  );

  const certificazioni = certRows.map((r) => ({
    id: r.id, type: r.type || '', fileName: r.file_name || '', fileUrl: r.file_url || '', expiry: r.expiry || ''
  }));

  const checkedAIds = new Set(impegniARows.map((r) => r.impegno_id));
  const fileAFilesByRole = { allergenManagementPlan: [], contaminationRiskAssessment: [] };
  fileAFileRows.forEach((r) => { fileAFilesByRole[r.role].push({ name: r.name || '', url: r.url || '' }); });
  const fileA = {
    impegni: boolArrayFromCheckedIds(impegniAIds, checkedAIds),
    ...Object.fromEntries(FILE_A_ROLES.map((role) => [role, fileAFilesByRole[role]]))
  };

  const fileB = {};
  impegniBRows.forEach((r) => { fileB[r.impegno_id] = true; });

  const fileC = prodottiRows.map((r) => ({
    id: r.id, tipologia: r.tipologia || '', denominazione: r.denominazione || '',
    origine: r.origine || '', shelfLife: r.shelf_life || ''
  }));

  const checkedCIds = new Set(impegniCRows.map((r) => r.impegno_id));
  const fileD = { impegni: boolArrayFromCheckedIds(impegniCIds, checkedCIds) };

  const filesByDoc = {};
  docFileRows.forEach((r) => {
    (filesByDoc[r.doc_id] ||= []).push({ name: r.name || '', url: r.url || '' });
  });
  const qualificationDocs = docRows.map((r) => ({
    id: r.id, name: r.name || '', note: r.note || '', date: r.doc_date || '',
    files: filesByDoc[r.id] || []
  }));

  const rmFilesByMaterial = {};
  rmFileRows.forEach((r) => {
    const bucket = (rmFilesByMaterial[r.material_id] ||= { analysisReports: [], riskAssessment: [] });
    bucket[r.role].push({ name: r.name || '', url: r.url || '' });
  });
  const rawMaterials = rmRows.map((r) => ({
    id: r.id, name: r.name || '', frequency: r.frequency || '',
    technicalSheet: r.technical_sheet_url ? { name: r.technical_sheet_name || '', url: r.technical_sheet_url } : null,
    analysisReports: rmFilesByMaterial[r.id]?.analysisReports || [],
    riskAssessment: rmFilesByMaterial[r.id]?.riskAssessment || []
  }));

  const ffdFilesBySection = { foodFraud: [], foodDefense: [] };
  ffdFileRows.forEach((r) => { ffdFilesBySection[r.section].push({ name: r.name || '', url: r.url || '' }); });
  const ffdAppliesToBySection = {};
  ffdRows.forEach((r) => { ffdAppliesToBySection[r.section] = r.applies_to || ''; });
  const foodFraudDefense = Object.fromEntries(
    FFD_SECTIONS.map((s) => [s, { files: ffdFilesBySection[s], appliesTo: ffdAppliesToBySection[s] || '' }])
  );

  const mpFilesByRole = { moca: [], technicalSpecs: [], migrationTests: [], ppwr: [] };
  mpFileRows.forEach((r) => { mpFilesByRole[r.role].push({ name: r.name || '', url: r.url || '' }); });
  const mocaPackaging = Object.fromEntries(MP_ROLES.map((role) => [role, mpFilesByRole[role]]));

  const haccpFilesByRole = { manualExtract: [], flowChart: [], prp: [], oprpCcp: [] };
  haccpFileRows.forEach((r) => { haccpFilesByRole[r.role].push({ name: r.name || '', url: r.url || '', appliesTo: r.applies_to || '' }); });
  const haccp = Object.fromEntries(HACCP_ROLES.map((role) => [role, haccpFilesByRole[role]]));

  const d = dossierRows[0] || {};
  const signedDossier = { fileName: d.signed_dossier_file_name || '', fileUrl: d.signed_dossier_file_url || '' };
  const impegnoSchede = {
    fileName: d.impegno_file_name || '', fileUrl: d.impegno_file_url || '',
    place: d.impegno_place || '', date: d.impegno_date || ''
  };

  return {
    anagrafica, contatti, certificazioni, fileA, fileB, fileC, fileD,
    qualificationDocs, rawMaterials, foodFraudDefense, mocaPackaging, haccp, signedDossier, impegnoSchede,
    pdfPlace: d.pdf_place || '', pdfDate: d.pdf_date || ''
  };
}

// Sostituisce per intero i dati del fornitore in tutte le tabelle normalizzate,
// dentro un'unica transazione (tutto-o-niente): ogni tab invia sempre l'intero
// oggetto qualData, quindi delete+insert per sezione riproduce esattamente il
// comportamento dell'UPSERT sul vecchio blob, senza ridurre l'atomicità.
async function saveQualData(supplierId, qualData) {
  const { impegniAIds, impegniCIds } = await getTemplateOrder();

  const deleteTables = [
    'qual_anagrafica', 'qual_contatti', 'qual_certificazioni', 'qual_impegni_a', 'qual_impegni_b',
    'qual_impegni_c', 'qual_file_a_files', 'qual_prodotti', 'qual_qualification_docs',
    'qual_qualification_doc_files', 'qual_raw_materials', 'qual_raw_material_files',
    'qual_food_fraud_defense', 'qual_food_fraud_defense_files', 'qual_moca_packaging_files',
    'qual_haccp_files', 'qual_dossier'
  ];

  await pool.withTransaction(async (conn) => {
    for (const table of deleteTables) {
      // eslint-disable-next-line no-await-in-loop
      await conn.query(`DELETE FROM ${table} WHERE supplier_id = ?`, [supplierId]);
    }

    const a = qualData.anagrafica || {};
    await conn.query(
      'INSERT INTO qual_anagrafica (supplier_id, rs, piva, sede, citta, provincia, cap, nazione) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [supplierId, a.rs || '', a.piva || '', a.sede || '', a.citta || '', a.provincia || '', a.cap || '', a.nazione || '']
    );

    const contatti = qualData.contatti || {};
    for (const dept of DEPTS) {
      const c = contatti[dept] || {};
      // eslint-disable-next-line no-await-in-loop
      await conn.query(
        'INSERT INTO qual_contatti (supplier_id, dept, nome, email, tel) VALUES (?, ?, ?, ?, ?)',
        [supplierId, dept, c.nome || '', c.email || '', c.tel || '']
      );
    }

    const certs = Array.isArray(qualData.certificazioni) ? qualData.certificazioni : [];
    for (let i = 0; i < certs.length; i++) {
      const c = certs[i];
      // eslint-disable-next-line no-await-in-loop
      await conn.query(
        'INSERT INTO qual_certificazioni (supplier_id, id, type, file_name, file_url, expiry, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [supplierId, String(c.id), c.type || '', c.fileName || '', c.fileUrl || '', c.expiry || '', i]
      );
    }

    const fileA = qualData.fileA || {};
    const checkedAIds = checkedIdsFromBoolArray(impegniAIds, fileA.impegni);
    for (const id of checkedAIds) {
      // eslint-disable-next-line no-await-in-loop
      await conn.query('INSERT INTO qual_impegni_a (supplier_id, impegno_id) VALUES (?, ?)', [supplierId, id]);
    }

    const fileB = qualData.fileB || {};
    for (const [impegnoId, checked] of Object.entries(fileB)) {
      if (!checked) continue;
      // eslint-disable-next-line no-await-in-loop
      await conn.query('INSERT INTO qual_impegni_b (supplier_id, impegno_id) VALUES (?, ?)', [supplierId, impegnoId]);
    }

    const fileD = qualData.fileD || {};
    const checkedCIds = checkedIdsFromBoolArray(impegniCIds, fileD.impegni);
    for (const id of checkedCIds) {
      // eslint-disable-next-line no-await-in-loop
      await conn.query('INSERT INTO qual_impegni_c (supplier_id, impegno_id) VALUES (?, ?)', [supplierId, id]);
    }

    for (const role of FILE_A_ROLES) {
      const files = Array.isArray(fileA[role]) ? fileA[role] : [];
      for (let j = 0; j < files.length; j++) {
        const f = files[j];
        // eslint-disable-next-line no-await-in-loop
        await conn.query(
          'INSERT INTO qual_file_a_files (supplier_id, role, name, url, sort_order) VALUES (?, ?, ?, ?, ?)',
          [supplierId, role, f.name || '', f.url || '', j]
        );
      }
    }

    const fileC = Array.isArray(qualData.fileC) ? qualData.fileC : [];
    for (let i = 0; i < fileC.length; i++) {
      const p = fileC[i];
      // eslint-disable-next-line no-await-in-loop
      await conn.query(
        'INSERT INTO qual_prodotti (supplier_id, id, tipologia, denominazione, origine, shelf_life, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [supplierId, String(p.id), p.tipologia || '', p.denominazione || '', p.origine || '', p.shelfLife || '', i]
      );
    }

    const docs = Array.isArray(qualData.qualificationDocs) ? qualData.qualificationDocs : [];
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      // eslint-disable-next-line no-await-in-loop
      await conn.query(
        'INSERT INTO qual_qualification_docs (supplier_id, id, name, note, doc_date, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [supplierId, String(doc.id), doc.name || '', doc.note || '', doc.date || '', i]
      );
      const files = Array.isArray(doc.files) ? doc.files : [];
      for (let j = 0; j < files.length; j++) {
        const f = files[j];
        // eslint-disable-next-line no-await-in-loop
        await conn.query(
          'INSERT INTO qual_qualification_doc_files (supplier_id, doc_id, name, url, sort_order) VALUES (?, ?, ?, ?, ?)',
          [supplierId, String(doc.id), f.name || '', f.url || '', j]
        );
      }
    }

    const materials = Array.isArray(qualData.rawMaterials) ? qualData.rawMaterials : [];
    for (let i = 0; i < materials.length; i++) {
      const m = materials[i];
      // eslint-disable-next-line no-await-in-loop
      await conn.query(
        'INSERT INTO qual_raw_materials (supplier_id, id, name, frequency, technical_sheet_name, technical_sheet_url, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [supplierId, String(m.id), m.name || '', m.frequency || '', m.technicalSheet?.name || null, m.technicalSheet?.url || null, i]
      );
      for (const role of RM_FILE_ROLES) {
        const files = Array.isArray(m[role]) ? m[role] : [];
        for (let j = 0; j < files.length; j++) {
          const f = files[j];
          // eslint-disable-next-line no-await-in-loop
          await conn.query(
            'INSERT INTO qual_raw_material_files (supplier_id, material_id, role, name, url, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            [supplierId, String(m.id), role, f.name || '', f.url || '', j]
          );
        }
      }
    }

    const ffd = qualData.foodFraudDefense || {};
    for (const section of FFD_SECTIONS) {
      const s = ffd[section] || {};
      // eslint-disable-next-line no-await-in-loop
      await conn.query(
        'INSERT INTO qual_food_fraud_defense (supplier_id, section, applies_to) VALUES (?, ?, ?)',
        [supplierId, section, s.appliesTo || '']
      );
      const files = Array.isArray(s.files) ? s.files : [];
      for (let j = 0; j < files.length; j++) {
        const f = files[j];
        // eslint-disable-next-line no-await-in-loop
        await conn.query(
          'INSERT INTO qual_food_fraud_defense_files (supplier_id, section, name, url, sort_order) VALUES (?, ?, ?, ?, ?)',
          [supplierId, section, f.name || '', f.url || '', j]
        );
      }
    }

    const mp = qualData.mocaPackaging || {};
    for (const role of MP_ROLES) {
      const files = Array.isArray(mp[role]) ? mp[role] : [];
      for (let j = 0; j < files.length; j++) {
        const f = files[j];
        // eslint-disable-next-line no-await-in-loop
        await conn.query(
          'INSERT INTO qual_moca_packaging_files (supplier_id, role, name, url, sort_order) VALUES (?, ?, ?, ?, ?)',
          [supplierId, role, f.name || '', f.url || '', j]
        );
      }
    }

    const haccp = qualData.haccp || {};
    for (const role of HACCP_ROLES) {
      const files = Array.isArray(haccp[role]) ? haccp[role] : [];
      for (let j = 0; j < files.length; j++) {
        const f = files[j];
        // eslint-disable-next-line no-await-in-loop
        await conn.query(
          'INSERT INTO qual_haccp_files (supplier_id, role, name, url, applies_to, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
          [supplierId, role, f.name || '', f.url || '', f.appliesTo || '', j]
        );
      }
    }

    const sd = qualData.signedDossier || {};
    const is = qualData.impegnoSchede || {};
    await conn.query(
      `INSERT INTO qual_dossier
        (supplier_id, pdf_place, pdf_date, signed_dossier_file_name, signed_dossier_file_url, impegno_file_name, impegno_file_url, impegno_place, impegno_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [supplierId, qualData.pdfPlace || '', qualData.pdfDate || '', sd.fileName || '', sd.fileUrl || '', is.fileName || '', is.fileUrl || '', is.place || '', is.date || '']
    );
  });

  return getQualData(supplierId);
}

module.exports = { getQualData, saveQualData };
