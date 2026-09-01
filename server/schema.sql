-- ============================================================
--  FOOD QUALITY MANAGER - SCHEMA MYSQL
--  Sostituisce il vecchio database Firestore (Firebase)
--  NB: le password (suppliers.qual_pass/tech_pass, admins.password_hash)
--  sono hash bcrypt: il seed con i valori di default viene eseguito da
--  initDb.js (bcrypt non e' disponibile in SQL puro).
-- ============================================================

CREATE DATABASE IF NOT EXISTS food_quality_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE food_quality_manager;

-- ------------------------------------------------------------
-- 1) FORNITORI
--    Mappa: artifacts/<appId>/public/data/suppliers
--    qual_pass / tech_pass contengono hash bcrypt (non plaintext)
-- ------------------------------------------------------------
-- "status" e' l'abilitazione al login (attivo/disattivo), NON lo stato di
-- avanzamento della qualifica: NON riusare per quello, altrimenti un
-- fornitore "non ancora qualificato" o "in revisione" verrebbe bloccato dal
-- login (vedi WHERE status = 'active' in routes/auth.js). Lo stato di
-- avanzamento vive separatamente in qualification_status (+ note interne
-- admin in qualification_notes), aggiunte dopo la creazione iniziale della
-- tabella — vedi addColumnIfMissing in initDb.js.
CREATE TABLE IF NOT EXISTS suppliers (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  qual_pass  VARCHAR(255) NOT NULL DEFAULT '',
  tech_pass  VARCHAR(255) NOT NULL DEFAULT '',
  status     VARCHAR(50)  NOT NULL DEFAULT 'active',
  qualification_status VARCHAR(50) NOT NULL DEFAULT 'not_qualified',
  qualification_notes  TEXT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2) AMMINISTRATORI (nuovo - autenticazione reale lato server)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3) IMPOSTAZIONI GLOBALI (logo + template allergeni/impegni)
--    Mappa: artifacts/<appId>/public/data/settings/global
--    Il JSON salva: {"logo": "/uploads/global/...", "templates": {...}}
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  setting_key   VARCHAR(100) NOT NULL PRIMARY KEY,
  setting_value LONGTEXT     NULL,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4) QUALIFICHE FORNITORE (qualData + productSpecs + lastUpdate)
--    Mappa: artifacts/<appId>/public/data/qualifications/<supplierId>
--    I file allegati sono referenziati come {name, url} verso
--    /uploads/<supplierId>/... invece di base64 inline.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qualifications (
  supplier_id   VARCHAR(64) NOT NULL PRIMARY KEY,
  qual_data     LONGTEXT    NULL, -- DEPRECATED dopo Fase 2+3: non piu' scritto, frozen come
                                   -- snapshot storico per rollback/diff. Non droppare.
  product_specs LONGTEXT    NULL,
  last_update   DATETIME    NULL,
  updated_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_qualifications_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Impostazione globale iniziale (nessuna password qui, solo dati pubblici)
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
  ('global', '{"logo":null,"templates":null}');

-- ------------------------------------------------------------
-- 5) TEMPLATE GLOBALI NORMALIZZATI (Fase 1 della normalizzazione)
--    Sostituiscono settings.setting_value.logo/templates: logo,
--    dichiarazioni A/B/C e griglia allergeni diventano righe reali
--    invece di un blob JSON, con sort_order a preservare l'ordine
--    che prima era dato dalla posizione nell'array.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  id INT PRIMARY KEY DEFAULT 1,
  logo_url VARCHAR(500) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO app_settings (id, logo_url) VALUES (1, NULL);

CREATE TABLE IF NOT EXISTS impegni_a (
  id VARCHAR(100) NOT NULL PRIMARY KEY,
  it TEXT, en TEXT, fr TEXT, es TEXT,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS impegni_b (
  id VARCHAR(100) NOT NULL PRIMARY KEY,
  title_it TEXT, desc_it TEXT, title_en TEXT, desc_en TEXT,
  title_fr TEXT, desc_fr TEXT, title_es TEXT, desc_es TEXT,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dichiarazione C: dal blocco "questionario fornitore" (domanda + risposta
-- Sì/No/N-A + note + allegato opzionale). "section" (+ section_en/fr/es)
-- raggruppa domande consecutive sotto un'intestazione comune (es.
-- "TRASPORTO / LOGISTICA"), come nei documenti questionario di riferimento;
-- "allow_attachment" decide se la domanda mostra uno slot di upload al
-- fornitore. "section" resta la versione italiana (nome storico della
-- colonna); section_en/fr/es sono state aggiunte dopo per permettere
-- all'intestazione di sezione di cambiare lingua come il testo domanda.
CREATE TABLE IF NOT EXISTS impegni_c (
  id VARCHAR(100) NOT NULL PRIMARY KEY,
  it TEXT, en TEXT, fr TEXT, es TEXT,
  section TEXT NULL,
  section_en TEXT NULL, section_fr TEXT NULL, section_es TEXT NULL,
  allow_attachment TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NB: se la tabella impegni_c esisteva già prima di questa modifica,
-- CREATE TABLE IF NOT EXISTS sopra non aggiunge le nuove colonne (MySQL non
-- supporta "ADD COLUMN IF NOT EXISTS" come MariaDB) — vedi ensureColumns()
-- in initDb.js, che le aggiunge in modo idempotente via information_schema.

CREATE TABLE IF NOT EXISTS allergens (
  id VARCHAR(100) NOT NULL PRIMARY KEY,
  it TEXT, en TEXT, fr TEXT, es TEXT,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6) DATI QUALIFICA FORNITORE NORMALIZZATI (Fase 2+3)
--    Sostituiscono qualifications.qual_data: ogni sezione del vecchio
--    blob diventa una tabella reale. NB: nessuna di queste tabelle ha
--    FK verso impegni_a/impegni_b/impegni_c/allergens — quelle tabelle
--    vengono svuotate e riscritte per intero ad ogni salvataggio admin
--    (vedi settingsService.replaceSimpleList), quindi una FK con CASCADE
--    cancellerebbe silenziosamente le risposte di tutti i fornitori ad
--    ogni modifica di un template. L'unica FK è verso suppliers(id).
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS qual_anagrafica (
  supplier_id VARCHAR(64) NOT NULL PRIMARY KEY,
  rs TEXT, piva VARCHAR(100), sede TEXT, citta VARCHAR(255),
  provincia VARCHAR(100), cap VARCHAR(20), nazione VARCHAR(100),
  CONSTRAINT fk_qa_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qual_contatti (
  supplier_id VARCHAR(64) NOT NULL,
  dept ENUM('sales','marketing','qualita','amministrazione','customer','logistica') NOT NULL,
  nome VARCHAR(255), email VARCHAR(255), tel VARCHAR(100),
  PRIMARY KEY (supplier_id, dept),
  CONSTRAINT fk_qc_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qual_certificazioni (
  supplier_id VARCHAR(64) NOT NULL,
  id VARCHAR(64) NOT NULL,
  type VARCHAR(255),
  file_name VARCHAR(500), file_url VARCHAR(500),
  expiry VARCHAR(20),
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (supplier_id, id),
  CONSTRAINT fk_qcert_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qual_impegni_a (
  supplier_id VARCHAR(64) NOT NULL,
  impegno_id VARCHAR(100) NOT NULL,
  PRIMARY KEY (supplier_id, impegno_id),
  CONSTRAINT fk_qia_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qual_impegni_b (
  supplier_id VARCHAR(64) NOT NULL,
  impegno_id VARCHAR(100) NOT NULL,
  PRIMARY KEY (supplier_id, impegno_id),
  CONSTRAINT fk_qib_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DEPRECATED: Dichiarazione C non usa piu' il semplice checkbox
-- accetta/non-accetta (sostituito dal questionario Sì/No/N-A qui sotto).
-- Tabella non piu' letta ne' scritta dall'app; mantenuta solo come
-- snapshot storico, non droppare.
CREATE TABLE IF NOT EXISTS qual_impegni_c (
  supplier_id VARCHAR(64) NOT NULL,
  impegno_id VARCHAR(100) NOT NULL,
  PRIMARY KEY (supplier_id, impegno_id),
  CONSTRAINT fk_qic_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Risposte del fornitore al questionario Dichiarazione C: una riga per
-- domanda, con risposta (Sì/No/N/A), note libere ed eventuali file allegati
-- (solo per le domande con allow_attachment=1 sul template impegni_c).
CREATE TABLE IF NOT EXISTS qual_declaration_c_answers (
  supplier_id VARCHAR(64) NOT NULL,
  impegno_id VARCHAR(100) NOT NULL,
  answer VARCHAR(10) NULL,
  notes TEXT NULL,
  PRIMARY KEY (supplier_id, impegno_id),
  CONSTRAINT fk_qdca_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qual_declaration_c_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id VARCHAR(64) NOT NULL,
  impegno_id VARCHAR(100) NOT NULL,
  name VARCHAR(500), url VARCHAR(500),
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_qdcf_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  INDEX idx_qdcf_impegno (supplier_id, impegno_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DEPRECATED: la griglia allergeni e' stata rimossa dalla Dichiarazione A
-- (sostituita da upload documentali in qual_file_a_files). Tabella non piu'
-- letta ne' scritta dall'app; mantenuta solo come snapshot storico, non droppare.
CREATE TABLE IF NOT EXISTS qual_allergen_answers (
  supplier_id VARCHAR(64) NOT NULL,
  allergen_id VARCHAR(100) NOT NULL,
  presence VARCHAR(100) NULL,
  gestione VARCHAR(100) NULL,
  notes TEXT NULL,
  PRIMARY KEY (supplier_id, allergen_id),
  CONSTRAINT fk_qaa_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qual_file_a_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id VARCHAR(64) NOT NULL,
  role ENUM('allergenManagementPlan','contaminationRiskAssessment') NOT NULL,
  name VARCHAR(500), url VARCHAR(500),
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_qfaf_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  INDEX idx_qfaf_role (supplier_id, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Griglia allergeni unica per fornitore (presenza/tracce/note), spostata qui
-- dalla Sezione F ("Dichiarazione Allergeni") della scheda tecnica prodotto:
-- non e' la stessa cosa della deprecata qual_allergen_answers qui sopra
-- (quella aveva "gestione" al posto di "tracce" ed era per-prodotto).
CREATE TABLE IF NOT EXISTS qual_file_a_allergens (
  supplier_id VARCHAR(64) NOT NULL,
  allergen_id VARCHAR(100) NOT NULL,
  presenza VARCHAR(100) NULL,
  tracce VARCHAR(100) NULL,
  note TEXT NULL,
  PRIMARY KEY (supplier_id, allergen_id),
  CONSTRAINT fk_qfaa_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qual_prodotti (
  supplier_id VARCHAR(64) NOT NULL,
  id VARCHAR(64) NOT NULL,
  tipologia VARCHAR(255), denominazione VARCHAR(500),
  origine VARCHAR(255), shelf_life VARCHAR(100),
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (supplier_id, id),
  CONSTRAINT fk_qp_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DEPRECATED: la tab "Documentazione Qualifica" e' stata rimossa dal
-- pannello di qualifica. Tabelle non piu' lette ne' scritte dall'app;
-- mantenute solo come snapshot storico, non droppare.
CREATE TABLE IF NOT EXISTS qual_qualification_docs (
  supplier_id VARCHAR(64) NOT NULL,
  id VARCHAR(64) NOT NULL,
  name VARCHAR(500), note TEXT, doc_date VARCHAR(20),
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (supplier_id, id),
  CONSTRAINT fk_qqd_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qual_qualification_doc_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id VARCHAR(64) NOT NULL,
  doc_id VARCHAR(64) NOT NULL,
  name VARCHAR(500), url VARCHAR(500),
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_qqdf_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  INDEX idx_qqdf_doc (supplier_id, doc_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- "notes" aggiunta dopo la creazione iniziale della tabella: vedi
-- addColumnIfMissing in initDb.js per l'aggiunta idempotente alle installazioni
-- gia' esistenti (CREATE TABLE IF NOT EXISTS qui sotto non tocca una tabella
-- che esiste gia').
CREATE TABLE IF NOT EXISTS qual_raw_materials (
  supplier_id VARCHAR(64) NOT NULL,
  id VARCHAR(64) NOT NULL,
  name VARCHAR(500), frequency VARCHAR(100),
  technical_sheet_name VARCHAR(500) NULL,
  technical_sheet_url VARCHAR(500) NULL,
  notes TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (supplier_id, id),
  CONSTRAINT fk_qrm_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qual_raw_material_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id VARCHAR(64) NOT NULL,
  material_id VARCHAR(64) NOT NULL,
  role ENUM('analysisReports','riskAssessment') NOT NULL,
  name VARCHAR(500), url VARCHAR(500),
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_qrmf_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  INDEX idx_qrmf_material (supplier_id, material_id, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qual_food_fraud_defense (
  supplier_id VARCHAR(64) NOT NULL,
  section ENUM('foodFraud','foodDefense') NOT NULL,
  applies_to VARCHAR(500),
  PRIMARY KEY (supplier_id, section),
  CONSTRAINT fk_qffd_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qual_food_fraud_defense_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id VARCHAR(64) NOT NULL,
  section ENUM('foodFraud','foodDefense') NOT NULL,
  name VARCHAR(500), url VARCHAR(500),
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_qffdf_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  INDEX idx_qffdf_section (supplier_id, section)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qual_moca_packaging_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id VARCHAR(64) NOT NULL,
  role ENUM('moca','technicalSpecs','migrationTests','ppwr') NOT NULL,
  name VARCHAR(500), url VARCHAR(500),
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_qmpf_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  INDEX idx_qmpf_role (supplier_id, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qual_haccp_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id VARCHAR(64) NOT NULL,
  role ENUM('manualExtract','flowChart','prp','oprpCcp') NOT NULL,
  name VARCHAR(500), url VARCHAR(500),
  applies_to VARCHAR(500),
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_qhf_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  INDEX idx_qhf_role (supplier_id, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qual_dossier (
  supplier_id VARCHAR(64) NOT NULL PRIMARY KEY,
  pdf_place VARCHAR(255), pdf_date VARCHAR(20),
  signed_dossier_file_name VARCHAR(500), signed_dossier_file_url VARCHAR(500),
  impegno_file_name VARCHAR(500), impegno_file_url VARCHAR(500),
  impegno_place VARCHAR(255), impegno_date VARCHAR(20),
  CONSTRAINT fk_qd_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
