const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

const SALT_ROUNDS = 10;

// Contenuto di riferimento del Questionario (Dichiarazione C), dai due
// questionari cliente ("3.1 Service Supplier Questionnaire" e "3.2 MOCA
// Supplier Questionnaire"). Seminato SOLO se la tabella impegni_c e' vuota
// (vedi piu' sotto) — non deve mai sovrascrivere domande gia' modificate
// dall'admin. Il testo e' in inglese (unica lingua fornita dal cliente): lo
// stesso testo va anche in "it" cosi' il fallback imp.it (usato se en/fr/es
// non sono ancora tradotte) non resta mai vuoto.
const DEFAULT_IMPEGNI_C = [
  { id: 'svc-1', section: 'LABORATORY / RETAINED SAMPLES', text: "If you perform laboratory testing activities, are you accredited by ACCREDIA for the tests you perform? If yes, indicate in Notes which tests are accredited and how many accredited tests you perform." },
  { id: 'svc-2', section: 'LABORATORY / RETAINED SAMPLES', text: "Do you retain a representative finished-product sample for each lot, where applicable? If yes, indicate in Notes the retention period and storage conditions." },
  { id: 'svc-3', section: 'TRAINING', text: "Does the company provide training on hygiene and food safety based on the HACCP system?" },
  { id: 'svc-4', section: 'TRAINING', text: "Does the company provide training on occupational health and safety in compliance with Italian Legislative Decree 81/2008?" },
  { id: 'svc-5', section: 'TRANSPORT / LOGISTICS', text: "Does the company hold the Health Authorisation required for the transport vehicles used, as required by DPR 327/80? If yes, indicate in Notes the relevant authorisation details." },
  { id: 'svc-6', section: 'TRANSPORT / LOGISTICS', text: "Does the company provide regular hygiene and food-safety training for transport personnel, as provided for by Regulations (EC) 852/2004 and 853/2004?" },
  { id: 'svc-7', section: 'TRANSPORT / LOGISTICS', allowAttachment: true, text: "For temperature-controlled transport, does the company have a system that ensures monitoring, recording and traceability of vehicle temperature for each individual shipment? If yes, indicate in Notes the system used and attach the company procedure/instruction governing temperature monitoring and control during transport.\n\nINFO: International Food Pivot reserves the right to request, on a sampling basis during the supply relationship, the temperature record/temperature trace relating to one or more specific shipments in order to verify compliance with the required transport conditions." },
  { id: 'svc-8', section: 'VEHICLE CLEANING', text: "Do you have a cleaning programme for the cargo compartments of vehicles used for our transports?" },
  { id: 'svc-9', section: 'VEHICLE CLEANING', text: "If yes, are records of these cleaning activities maintained?" },
  { id: 'moca-1', section: 'GMP AND CERTIFICATIONS', text: "Does the company manufacture food contact materials and articles in compliance with Regulation (EC) 2023/2006 and apply Good Manufacturing Practices?" },
  { id: 'moca-2', section: 'GMP AND CERTIFICATIONS', allowAttachment: true, text: "Are you certified according to BRCGS Packaging Materials, AIB, FEFCO, EN 15593 or other relevant standards? If yes, indicate in Notes the certification held." },
  { id: 'moca-3', section: 'SITE HYGIENE', allowAttachment: true, text: "Does the company operate a pest management system? Attach the relevant file." },
  { id: 'moca-4', section: 'LOT IDENTIFICATION', allowAttachment: true, text: "Do you have a lot identification system? If yes, how do you identify the lot and what is the meaning/decoding of the lot code? Enter the decoding in Notes and, if available, attach the procedure." },
  { id: 'moca-6', section: 'MEASURING EQUIPMENT', text: "Do you have a system/procedure for the calibration of product and process measuring and monitoring equipment, ensuring traceability of the results to ACCREDIA-calibrated or equivalent reference equipment?" },
  { id: 'moca-7', section: 'MIGRATION / RELEASE TESTING', allowAttachment: true, text: "Do you periodically perform migration/release tests on the articles supplied to us or on similar/representative articles? If yes, attach the available test report/certificate." },
  { id: 'moca-8', section: 'MIGRATION / RELEASE TESTING', text: "Are the migration/release tests performed by an ACCREDIA-accredited or equivalent laboratory, where applicable? If yes, indicate in Notes the laboratory used." },
];

// Traduzioni reali IT/FR/ES per le domande sopra (l'inglese e' quello
// fornito dal cliente, usato com'e'). Usate dalla migrazione idempotente più
// sotto per sostituire il placeholder "stesso testo in tutte le lingue"
// scritto al momento del seed iniziale — mai per sovrascrivere domande che
// l'admin ha gia' modificato a mano (vedi condizione it === en piu' sotto).
const IMPEGNI_C_TRANSLATIONS = {
  'svc-1': {
    it: "Se svolgete attività di analisi di laboratorio, siete accreditati ACCREDIA per le prove eseguite? In caso affermativo, indicare nelle Note quali prove sono accreditate e quante prove accreditate vengono eseguite.",
    fr: "Si vous effectuez des activités d'analyses de laboratoire, êtes-vous accrédités ACCREDIA pour les essais que vous réalisez ? Si oui, indiquez dans les Notes quels essais sont accrédités et combien d'essais accrédités vous réalisez.",
    es: "Si realiza actividades de análisis de laboratorio, ¿está acreditado por ACCREDIA para los ensayos que realiza? En caso afirmativo, indique en las Notas qué ensayos están acreditados y cuántos ensayos acreditados realiza.",
  },
  'svc-2': {
    it: "Trattenete un campione rappresentativo di prodotto finito per ogni lotto, ove applicabile? In caso affermativo, indicare nelle Note il periodo di conservazione e le condizioni di stoccaggio.",
    fr: "Conservez-vous un échantillon représentatif du produit fini pour chaque lot, le cas échéant ? Si oui, indiquez dans les Notes la durée de conservation et les conditions de stockage.",
    es: "¿Conserva una muestra representativa del producto terminado para cada lote, cuando corresponda? En caso afirmativo, indique en las Notas el período de conservación y las condiciones de almacenamiento.",
  },
  'svc-3': {
    it: "L'azienda fornisce formazione in materia di igiene e sicurezza alimentare basata sul sistema HACCP?",
    fr: "L'entreprise dispense-t-elle une formation en matière d'hygiène et de sécurité alimentaire basée sur le système HACCP ?",
    es: "¿La empresa imparte formación en materia de higiene y seguridad alimentaria basada en el sistema HACCP?",
  },
  'svc-4': {
    it: "L'azienda fornisce formazione in materia di salute e sicurezza sul lavoro in conformità al D.Lgs. 81/2008?",
    fr: "L'entreprise dispense-t-elle une formation en matière de santé et de sécurité au travail conformément au Décret législatif italien 81/2008 ?",
    es: "¿La empresa imparte formación en materia de salud y seguridad en el trabajo conforme al Decreto Legislativo italiano 81/2008?",
  },
  'svc-5': {
    it: "L'azienda possiede l'Autorizzazione Sanitaria richiesta per i mezzi di trasporto utilizzati, ai sensi del DPR 327/80? In caso affermativo, indicare nelle Note gli estremi dell'autorizzazione.",
    fr: "L'entreprise dispose-t-elle de l'Autorisation Sanitaire requise pour les véhicules de transport utilisés, conformément au DPR 327/80 ? Si oui, indiquez dans les Notes les détails de l'autorisation.",
    es: "¿La empresa dispone de la Autorización Sanitaria requerida para los vehículos de transporte utilizados, conforme al DPR 327/80? En caso afirmativo, indique en las Notas los datos de la autorización.",
  },
  'svc-6': {
    it: "L'azienda fornisce formazione periodica in materia di igiene e sicurezza alimentare al personale addetto al trasporto, come previsto dai Regolamenti (CE) 852/2004 e 853/2004?",
    fr: "L'entreprise dispense-t-elle une formation régulière en matière d'hygiène et de sécurité alimentaire au personnel de transport, comme le prévoient les Règlements (CE) 852/2004 et 853/2004 ?",
    es: "¿La empresa imparte formación periódica en materia de higiene y seguridad alimentaria al personal de transporte, según lo previsto por los Reglamentos (CE) 852/2004 y 853/2004?",
  },
  'svc-7': {
    it: "Per il trasporto a temperatura controllata, l'azienda dispone di un sistema che garantisce il monitoraggio, la registrazione e la tracciabilità della temperatura del veicolo per ogni singola spedizione? In caso affermativo, indicare nelle Note il sistema utilizzato e allegare la procedura/istruzione aziendale che disciplina il monitoraggio e il controllo della temperatura durante il trasporto.\n\nINFO: International Food Pivot si riserva il diritto di richiedere, a campione durante il rapporto di fornitura, la registrazione/traccia della temperatura relativa a una o più spedizioni specifiche al fine di verificare la conformità alle condizioni di trasporto richieste.",
    fr: "Pour le transport à température contrôlée, l'entreprise dispose-t-elle d'un système garantissant le suivi, l'enregistrement et la traçabilité de la température du véhicule pour chaque expédition individuelle ? Si oui, indiquez dans les Notes le système utilisé et joignez la procédure/instruction de l'entreprise régissant le suivi et le contrôle de la température pendant le transport.\n\nINFO : International Food Pivot se réserve le droit de demander, à titre d'échantillonnage pendant la relation d'approvisionnement, l'enregistrement/la trace de température relative à une ou plusieurs expéditions spécifiques afin de vérifier la conformité aux conditions de transport requises.",
    es: "Para el transporte a temperatura controlada, ¿dispone la empresa de un sistema que garantice el seguimiento, registro y trazabilidad de la temperatura del vehículo para cada envío individual? En caso afirmativo, indique en las Notas el sistema utilizado y adjunte el procedimiento/instrucción de la empresa que regula el seguimiento y control de la temperatura durante el transporte.\n\nINFO: International Food Pivot se reserva el derecho de solicitar, de forma muestral durante la relación de suministro, el registro/traza de temperatura relativo a uno o varios envíos específicos con el fin de verificar el cumplimiento de las condiciones de transporte requeridas.",
  },
  'svc-8': {
    it: "Disponete di un programma di pulizia per i vani di carico dei veicoli utilizzati per i nostri trasporti?",
    fr: "Disposez-vous d'un programme de nettoyage pour les compartiments de chargement des véhicules utilisés pour nos transports ?",
    es: "¿Dispone de un programa de limpieza para los compartimentos de carga de los vehículos utilizados para nuestros transportes?",
  },
  'svc-9': {
    it: "In caso affermativo, vengono conservate le registrazioni di tali attività di pulizia?",
    fr: "Si oui, des enregistrements de ces activités de nettoyage sont-ils conservés ?",
    es: "En caso afirmativo, ¿se conservan los registros de dichas actividades de limpieza?",
  },
  'moca-1': {
    it: "L'azienda produce materiali e oggetti destinati a contatto con alimenti in conformità al Regolamento (CE) 2023/2006 e applica le Buone Pratiche di Fabbricazione (GMP)?",
    fr: "L'entreprise fabrique-t-elle des matériaux et objets destinés au contact alimentaire conformément au Règlement (CE) 2023/2006 et applique-t-elle les Bonnes Pratiques de Fabrication (BPF) ?",
    es: "¿La empresa fabrica materiales y objetos destinados a entrar en contacto con alimentos conforme al Reglamento (CE) 2023/2006 y aplica las Buenas Prácticas de Fabricación (BPF)?",
  },
  'moca-2': {
    it: "Siete certificati secondo BRCGS Packaging Materials, AIB, FEFCO, EN 15593 o altri standard pertinenti? In caso affermativo, indicare nelle Note la certificazione posseduta.",
    fr: "Êtes-vous certifiés selon BRCGS Packaging Materials, AIB, FEFCO, EN 15593 ou d'autres normes pertinentes ? Si oui, indiquez dans les Notes la certification détenue.",
    es: "¿Está certificado según BRCGS Packaging Materials, AIB, FEFCO, EN 15593 u otras normas pertinentes? En caso afirmativo, indique en las Notas la certificación que posee.",
  },
  'moca-3': {
    it: "L'azienda dispone di un sistema di gestione della disinfestazione (pest control)? Allegare il relativo documento.",
    fr: "L'entreprise applique-t-elle un système de gestion de la lutte antiparasitaire ? Joindre le document correspondant.",
    es: "¿La empresa cuenta con un sistema de control de plagas? Adjunte el documento correspondiente.",
  },
  'moca-4': {
    it: "Disponete di un sistema di identificazione del lotto? In caso affermativo, come identificate il lotto e qual è il significato/la decodifica del codice lotto? Inserire la decodifica nelle Note e, se disponibile, allegare la procedura.",
    fr: "Disposez-vous d'un système d'identification du lot ? Si oui, comment identifiez-vous le lot et quelle est la signification/le décodage du code de lot ? Indiquez le décodage dans les Notes et, si disponible, joignez la procédure.",
    es: "¿Dispone de un sistema de identificación del lote? En caso afirmativo, ¿cómo identifica el lote y cuál es el significado/la decodificación del código de lote? Introduzca la decodificación en las Notas y, si está disponible, adjunte el procedimiento.",
  },
  'moca-6': {
    it: "Disponete di un sistema/procedura per la taratura degli strumenti di misura e monitoraggio di prodotto e di processo, che garantisca la tracciabilità dei risultati rispetto a strumenti di riferimento tarati ACCREDIA o equivalenti?",
    fr: "Disposez-vous d'un système/d'une procédure d'étalonnage des équipements de mesure et de surveillance du produit et du procédé, garantissant la traçabilité des résultats par rapport à des équipements de référence étalonnés ACCREDIA ou équivalents ?",
    es: "¿Dispone de un sistema/procedimiento para la calibración de los equipos de medición y seguimiento de producto y proceso, que garantice la trazabilidad de los resultados respecto a equipos de referencia calibrados por ACCREDIA o equivalentes?",
  },
  'moca-7': {
    it: "Eseguite periodicamente test di migrazione/cessione sugli articoli a noi forniti o su articoli simili/rappresentativi? In caso affermativo, allegare il rapporto di prova/certificato disponibile.",
    fr: "Effectuez-vous périodiquement des essais de migration/cession sur les articles qui nous sont fournis ou sur des articles similaires/représentatifs ? Si oui, joignez le rapport d'essai/certificat disponible.",
    es: "¿Realiza periódicamente ensayos de migración/cesión sobre los artículos que nos suministra o sobre artículos similares/representativos? En caso afirmativo, adjunte el informe de ensayo/certificado disponible.",
  },
  'moca-8': {
    it: "I test di migrazione/cessione sono eseguiti da un laboratorio accreditato ACCREDIA o equivalente, ove applicabile? In caso affermativo, indicare nelle Note il laboratorio utilizzato.",
    fr: "Les essais de migration/cession sont-ils réalisés par un laboratoire accrédité ACCREDIA ou équivalent, le cas échéant ? Si oui, indiquez dans les Notes le laboratoire utilisé.",
    es: "¿Los ensayos de migración/cesión son realizados por un laboratorio acreditado por ACCREDIA o equivalente, cuando corresponda? En caso afirmativo, indique en las Notas el laboratorio utilizado.",
  },
};

const IMPEGNI_C_SECTION_TRANSLATIONS = {
  'LABORATORY / RETAINED SAMPLES': { it: 'LABORATORIO / CAMPIONI TRATTENUTI', fr: 'LABORATOIRE / ÉCHANTILLONS TÉMOINS', es: 'LABORATORIO / MUESTRAS RETENIDAS' },
  'TRAINING': { it: 'FORMAZIONE', fr: 'FORMATION', es: 'FORMACIÓN' },
  'TRANSPORT / LOGISTICS': { it: 'TRASPORTO / LOGISTICA', fr: 'TRANSPORT / LOGISTIQUE', es: 'TRANSPORTE / LOGÍSTICA' },
  'VEHICLE CLEANING': { it: 'PULIZIA DEI VEICOLI', fr: 'NETTOYAGE DES VÉHICULES', es: 'LIMPIEZA DE VEHÍCULOS' },
  'GMP AND CERTIFICATIONS': { it: 'GMP E CERTIFICAZIONI', fr: 'BPF ET CERTIFICATIONS', es: 'BPF Y CERTIFICACIONES' },
  'SITE HYGIENE': { it: 'IGIENE DELLO STABILIMENTO', fr: 'HYGIÈNE DU SITE', es: 'HIGIENE DE LA PLANTA' },
  'LOT IDENTIFICATION': { it: 'IDENTIFICAZIONE DEL LOTTO', fr: 'IDENTIFICATION DU LOT', es: 'IDENTIFICACIÓN DEL LOTE' },
  'MEASURING EQUIPMENT': { it: 'STRUMENTI DI MISURA', fr: 'ÉQUIPEMENTS DE MESURE', es: 'EQUIPOS DE MEDICIÓN' },
  'MIGRATION / RELEASE TESTING': { it: 'TEST DI MIGRAZIONE / CESSIONE', fr: 'ESSAIS DE MIGRATION / CESSION', es: 'ENSAYOS DE MIGRACIÓN / CESIÓN' },
};

// MySQL (a differenza di MariaDB) non supporta "ALTER TABLE ... ADD COLUMN
// IF NOT EXISTS": per aggiungere colonne a tabelle create da versioni
// precedenti di schema.sql in modo idempotente, si verifica prima la loro
// esistenza via information_schema.
async function addColumnIfMissing(connection, dbName, table, column, definition) {
  const [rows] = await connection.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [dbName, table, column]
  );
  if (rows.length) return;
  await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

// Esegue schema.sql (crea database + tabelle) e poi semina gli account di
// default con password hashate (bcrypt non è disponibile in SQL puro).
// Esportata come funzione (invece che IIFE auto-eseguita) così può essere
// chiamata sia da riga di comando ("npm run db:init") sia da app.js
// all'avvio del server: su Railway il "pre-deploy command" gira in un
// contesto separato dove le reference variable del plugin MySQL non sono
// sempre risolte, mentre il servizio web avviato con `node server/app.js`
// le riceve correttamente iniettate.
async function initDb() {
  console.log('🔍 Environment variables:');
  console.log(`   DB_HOST=${process.env.DB_HOST || 'localhost (default)'}`);
  console.log(`   DB_PORT=${process.env.DB_PORT || '3306 (default)'}`);
  console.log(`   DB_USER=${process.env.DB_USER || 'root (default)'}`);
  console.log(`   DB_PASSWORD=${process.env.DB_PASSWORD ? '***' : '(empty)'}`);
  console.log(`   DB_NAME=${process.env.DB_NAME || 'food_quality_manager (default)'}`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    charset: 'utf8mb4'
  });

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schema);

    const dbName = process.env.DB_NAME || 'food_quality_manager';
    await connection.changeUser({ database: dbName });

    // Colonne aggiunte a impegni_c dopo la creazione iniziale della tabella
    // (vedi commento in schema.sql): idempotente, sicura da rieseguire ad ogni boot.
    await addColumnIfMissing(connection, dbName, 'impegni_c', 'section', 'TEXT NULL');
    await addColumnIfMissing(connection, dbName, 'impegni_c', 'allow_attachment', 'TINYINT(1) NOT NULL DEFAULT 0');
    await addColumnIfMissing(connection, dbName, 'impegni_c', 'section_en', 'TEXT NULL');
    await addColumnIfMissing(connection, dbName, 'impegni_c', 'section_fr', 'TEXT NULL');
    await addColumnIfMissing(connection, dbName, 'impegni_c', 'section_es', 'TEXT NULL');
    await addColumnIfMissing(connection, dbName, 'qual_raw_materials', 'notes', 'TEXT NULL');
    await addColumnIfMissing(connection, dbName, 'suppliers', 'qualification_status', "VARCHAR(50) NOT NULL DEFAULT 'not_qualified'");
    await addColumnIfMissing(connection, dbName, 'suppliers', 'qualification_notes', 'TEXT NULL');

    // --- Questionario (impegni_c): seminato SOLO se la tabella e' vuota, mai
    // se contiene gia' qualcosa (anche una sola domanda di test) — l'admin
    // deve poter svuotare/modificare la lista senza che riappaia da sola ad
    // ogni riavvio del server.
    const [impegniCRows] = await connection.query('SELECT COUNT(*) AS n FROM impegni_c');
    if (impegniCRows[0].n === 0) {
      for (let i = 0; i < DEFAULT_IMPEGNI_C.length; i++) {
        const q = DEFAULT_IMPEGNI_C[i];
        // eslint-disable-next-line no-await-in-loop
        await connection.query(
          `INSERT INTO impegni_c (id, it, en, fr, es, section, section_en, section_fr, section_es, allow_attachment, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [q.id, q.text, q.text, q.text, q.text, q.section, q.section, q.section, q.section, q.allowAttachment ? 1 : 0, i]
        );
      }
      console.log(`   Questionario: ${DEFAULT_IMPEGNI_C.length} domande di riferimento inserite (tabella impegni_c era vuota).`);
    }

    // --- Fix dati: il seed originale (sopra, o su un deploy precedente)
    // scriveva lo stesso testo inglese in it/en/fr/es come placeholder,
    // perche' il cliente aveva fornito il questionario solo in inglese —
    // risultato: cambiare lingua su /qualifica non cambiava il testo
    // mostrato. Qui si sostituiscono it/fr/es (e section/section_fr/
    // section_es) con traduzioni vere, ma SOLO per le righe con it === en
    // (segno che nessuno le ha gia' personalizzate dall'admin) — idempotente
    // e sicura da rieseguire ad ogni boot, anche su Railway.
    const [impegniCToFix] = await connection.query('SELECT id, it, en, section_en FROM impegni_c');
    let fixedCount = 0;
    for (const row of impegniCToFix) {
      if (row.it !== row.en) continue;
      const q = IMPEGNI_C_TRANSLATIONS[row.id];
      if (!q) continue;
      const sec = IMPEGNI_C_SECTION_TRANSLATIONS[row.section_en];
      // eslint-disable-next-line no-await-in-loop
      await connection.query(
        sec
          ? 'UPDATE impegni_c SET it = ?, fr = ?, es = ?, section = ?, section_fr = ?, section_es = ? WHERE id = ?'
          : 'UPDATE impegni_c SET it = ?, fr = ?, es = ? WHERE id = ?',
        sec ? [q.it, q.fr, q.es, sec.it, sec.fr, sec.es, row.id] : [q.it, q.fr, q.es, row.id]
      );
      fixedCount += 1;
    }
    if (fixedCount) {
      console.log(`   Questionario: ${fixedCount} domande aggiornate con traduzioni reali IT/FR/ES (erano identiche a EN).`);
    }

    // --- Fornitori di test/demo (come nel vecchio client Firebase) ---
    const seedSuppliers = [
      { id: 'test-profile-sys', name: 'TEST', qualPass: 'test', techPass: 'test' },
      { id: 'demo-profile-sys', name: 'DEMO', qualPass: '1', techPass: '1' }
    ];

    for (const s of seedSuppliers) {
      const [rows] = await connection.query('SELECT id FROM suppliers WHERE id = ?', [s.id]);
      if (rows.length) continue; // non sovrascrivere password già impostate/cambiate
      const qualHash = await bcrypt.hash(s.qualPass, SALT_ROUNDS);
      const techHash = await bcrypt.hash(s.techPass, SALT_ROUNDS);
      await connection.query(
        'INSERT INTO suppliers (id, name, qual_pass, tech_pass, status) VALUES (?, ?, ?, ?, ?)',
        [s.id, s.name, qualHash, techHash, 'active']
      );
    }

    // --- Admin di default ---
    const adminUsername = process.env.ADMIN_DEFAULT_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || '0404';

    const [adminRows] = await connection.query('SELECT id FROM admins WHERE username = ?', [adminUsername]);
    if (!adminRows.length) {
      const adminHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
      await connection.query(
        'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
        [adminUsername, adminHash]
      );
    }

    console.log('✅ Database "food_quality_manager", tabelle e account di default creati/verificati con successo.');
    console.log(`   Admin: ${adminUsername} / ${adminRows.length ? '(esistente, non modificato)' : adminPassword}`);
    console.log('   Fornitori seed: TEST/test/test, DEMO/1/1 (solo se non già presenti)');
  } finally {
    await connection.end();
  }
}

module.exports = { initDb };

// Eseguito solo quando lanciato direttamente ("npm run db:init"), non
// quando importato da app.js.
if (require.main === module) {
  initDb().catch((err) => {
    console.error('❌ Errore inizializzazione database:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  });
}

