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
CREATE TABLE IF NOT EXISTS suppliers (
  id         VARCHAR(64)  NOT NULL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  qual_pass  VARCHAR(255) NOT NULL DEFAULT '',
  tech_pass  VARCHAR(255) NOT NULL DEFAULT '',
  status     VARCHAR(50)  NOT NULL DEFAULT 'active',
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
  qual_data     LONGTEXT    NULL,
  product_specs LONGTEXT    NULL,
  last_update   DATETIME    NULL,
  updated_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_qualifications_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Impostazione globale iniziale (nessuna password qui, solo dati pubblici)
INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
  ('global', '{"logo":null,"templates":null}');
