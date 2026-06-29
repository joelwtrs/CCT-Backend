-- ============================================================
-- Microcom Security Audit Platform — Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS cct CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cct;

-- Gebruikers
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('admin','medewerker') NOT NULL DEFAULT 'medewerker',
  active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Klanten
CREATE TABLE IF NOT EXISTS clients (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  contact     VARCHAR(150),
  email       VARCHAR(150),
  phone       VARCHAR(50),
  address     TEXT,
  active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Migratie bestaande installaties:
-- ALTER TABLE clients ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1;

-- Audits
CREATE TABLE IF NOT EXISTS audits (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  client_id     INT NOT NULL,
  created_by    INT NOT NULL,
  title         VARCHAR(200) NOT NULL,
  status        ENUM('open','in_progress','completed') NOT NULL DEFAULT 'open',
  audit_date    DATE,
  auditor_name  VARCHAR(150),
  notes         TEXT,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Tracks
CREATE TABLE IF NOT EXISTS tracks (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  client_id     INT NOT NULL,
  user_id       INT NOT NULL,
  contact_type  VARCHAR(30) NOT NULL,
  contact_date  DATE NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME,
  question      TEXT NOT NULL,
  feedback      TEXT,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Algemene checklist antwoorden (per audit)
CREATE TABLE IF NOT EXISTS audit_general_checks (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  audit_id   INT NOT NULL,
  check_id   VARCHAR(20) NOT NULL,   -- bv. 'f1', 'b3', 'p2'
  checked    TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_audit_check (audit_id, check_id),
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
);

-- Opmerkingen per sectie (algemeen)
CREATE TABLE IF NOT EXISTS audit_remarks (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  audit_id   INT NOT NULL,
  remark_key VARCHAR(100) NOT NULL,  -- bv. 'fysiek_Toegangscontrole_gebouw'
  value      TEXT,
  UNIQUE KEY uq_audit_remark (audit_id, remark_key),
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
);

-- Toestellen per audit
CREATE TABLE IF NOT EXISTS audit_devices (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  audit_id   INT NOT NULL,
  device_key VARCHAR(50) NOT NULL,   -- unieke key binnen de audit (bv. uuid)
  category   ENUM('pc','server','firewall','switch','wifi','overig') NOT NULL,
  hostname   VARCHAR(200) NOT NULL,
  os         VARCHAR(200),
  brand      VARCHAR(100),
  model      VARCHAR(100),
  domain_joined VARCHAR(50),
  localadmin VARCHAR(50),
  user_resp  VARCHAR(200),
  location   VARCHAR(200),
  notes      TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
);

-- Checklist antwoorden per toestel
CREATE TABLE IF NOT EXISTS audit_device_checks (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  audit_id   INT NOT NULL,
  device_key VARCHAR(50) NOT NULL,
  check_id   VARCHAR(20) NOT NULL,   -- bv. 'pc_os', 'fw_pwd'
  checked    TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_device_check (audit_id, device_key, check_id),
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
);

-- Vrije notities per audit
CREATE TABLE IF NOT EXISTS audit_notities (
  audit_id   INT PRIMARY KEY,
  content    LONGTEXT,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE
);

-- ============================================================
-- Standaard data
-- ============================================================

-- Admin gebruiker (wachtwoord: password — wijzig direct na installatie)
INSERT INTO users (name, email, password, role) VALUES
('Administrator', 'admin@microcom.be', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
