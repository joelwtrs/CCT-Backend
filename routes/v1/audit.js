const express = require("express");
const db = require("../../db");
const { authMiddleware } = require("../../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// GET /api/audits — overzicht
router.get("/", async (req, res) => {
  const [rows] = await db.query(`
    SELECT a.*, c.name AS client_name, u.name AS created_by_name
    FROM audits a
    JOIN clients c ON c.id = a.client_id
    JOIN users   u ON u.id = a.created_by
    ORDER BY a.updated_at DESC
  `);
  res.json(rows);
});

// GET /api/audits/:id — volledig audit object (checks, devices, notities)
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  const [[audit]] = await db.query(
    `
    SELECT a.*, c.name AS client_name, u.name AS created_by_name
    FROM audits a
    JOIN clients c ON c.id = a.client_id
    JOIN users   u ON u.id = a.created_by
    WHERE a.id = ?
  `,
    [id],
  );
  if (!audit) return res.status(404).json({ error: "Audit niet gevonden." });

  // Checks (algemeen)
  const [checks] = await db.query(
    "SELECT check_id, checked FROM audit_general_checks WHERE audit_id = ?",
    [id],
  );
  // Remarks
  const [remarks] = await db.query(
    "SELECT remark_key, value FROM audit_remarks WHERE audit_id = ?",
    [id],
  );
  // Devices
  const [devices] = await db.query(
    "SELECT * FROM audit_devices WHERE audit_id = ? ORDER BY category, id",
    [id],
  );
  // Device checks
  const [deviceChecks] = await db.query(
    "SELECT device_key, check_id, checked FROM audit_device_checks WHERE audit_id = ?",
    [id],
  );
  // Notities
  const [[notitie]] = await db.query(
    "SELECT content FROM audit_notities WHERE audit_id = ?",
    [id],
  );

  // Transform for frontend
  const checksObj = {};
  checks.forEach((r) => {
    if (r.checked) checksObj[r.check_id] = true;
  });

  const remarksObj = {};
  remarks.forEach((r) => {
    remarksObj[r.remark_key] = r.value;
  });

  const devicesObj = {};
  devices.forEach((d) => {
    if (!devicesObj[d.category]) devicesObj[d.category] = [];
    devicesObj[d.category].push({
      id: d.device_key,
      category: d.category,
      hostname: d.hostname,
      os: d.os || "",
      brand: d.brand || "",
      model: d.model || "",
      domain_joined: d.domain_joined || "",
      localadmin: d.localadmin || "",
      user: d.user_resp || "",
      location: d.location || "",
      notes: d.notes || "",
    });
  });

  const deviceChecksObj = {};
  deviceChecks.forEach((r) => {
    if (r.checked) deviceChecksObj[r.device_key + "_" + r.check_id] = true;
  });

  res.json({
    ...audit,
    checks: checksObj,
    remarks: remarksObj,
    devices: devicesObj,
    deviceChecks: deviceChecksObj,
    notities: notitie ? notitie.content : "",
  });
});

// POST /api/audits — nieuwe audit aanmaken
router.post("/", async (req, res) => {
  const { client_id, title, audit_date, auditor_name, notes } = req.body;
  if (!client_id || !title)
    return res.status(400).json({ error: "Klant en titel zijn verplicht." });

  const [result] = await db.query(
    "INSERT INTO audits (client_id, created_by, title, audit_date, auditor_name, notes) VALUES (?, ?, ?, ?, ?, ?)",
    [
      client_id,
      req.user.id,
      title,
      audit_date || null,
      auditor_name || null,
      notes || null,
    ],
  );
  res.status(201).json({ id: result.insertId });
});

// PATCH /api/audits/:id — update metadata
router.patch("/:id", async (req, res) => {
  const { status, notes, title, audit_date, auditor_name } = req.body;
  const fields = [];
  const values = [];
  if (title) {
    fields.push("title = ?");
    values.push(title);
  }
  if (audit_date) {
    fields.push("audit_date = ?");
    values.push(audit_date);
  }
  if (auditor_name !== undefined) {
    fields.push("auditor_name = ?");
    values.push(auditor_name);
  }
  if (notes !== undefined) {
    fields.push("notes = ?");
    values.push(notes);
  }
  if (status && ["open", "in_progress", "completed"].includes(status)) {
    fields.push("status = ?");
    values.push(status);
  }
  if (!fields.length)
    return res.status(400).json({ error: "Geen velden om bij te werken." });
  values.push(req.params.id);
  await db.query(`UPDATE audits SET ${fields.join(", ")} WHERE id = ?`, values);
  res.json({ message: "Audit bijgewerkt." });
});

// PUT /api/audits/:id/checks — sla alle algemene checks op
router.put("/:id/checks", async (req, res) => {
  const { checks } = req.body; // { checkId: bool, ... }
  if (!checks) return res.status(400).json({ error: "checks ontbreekt." });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const [checkId, checked] of Object.entries(checks)) {
      await conn.query(
        `
        INSERT INTO audit_general_checks (audit_id, check_id, checked) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE checked = VALUES(checked)
      `,
        [req.params.id, checkId, checked ? 1 : 0],
      );
    }
    await conn.commit();
    // Zet status op in_progress als nog 'open'
    await db.query(
      `UPDATE audits SET status='in_progress' WHERE id=? AND status='open'`,
      [req.params.id],
    );
    res.json({ message: "Checks opgeslagen." });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// PUT /api/audits/:id/remarks — sla alle opmerkingen op
router.put("/:id/remarks", async (req, res) => {
  const { remarks } = req.body;
  if (!remarks) return res.status(400).json({ error: "remarks ontbreekt." });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const [key, value] of Object.entries(remarks)) {
      await conn.query(
        `
        INSERT INTO audit_remarks (audit_id, remark_key, value) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE value = VALUES(value)
      `,
        [req.params.id, key, value],
      );
    }
    await conn.commit();
    res.json({ message: "Opmerkingen opgeslagen." });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// PUT /api/audits/:id/notities — sla vrije notities op
router.put("/:id/notities", async (req, res) => {
  const { content } = req.body;
  await db.query(
    `
    INSERT INTO audit_notities (audit_id, content) VALUES (?, ?)
    ON DUPLICATE KEY UPDATE content = VALUES(content)
  `,
    [req.params.id, content || ""],
  );
  res.json({ message: "Notities opgeslagen." });
});

// PUT /api/audits/:id/devices — sla alle devices op (complete sync)
router.put("/:id/devices", async (req, res) => {
  const { devices, deviceChecks } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // Verwijder bestaande devices en checks
    await conn.query("DELETE FROM audit_device_checks WHERE audit_id = ?", [
      req.params.id,
    ]);
    await conn.query("DELETE FROM audit_devices WHERE audit_id = ?", [
      req.params.id,
    ]);
    // Insert nieuwe devices
    const cats = ["pc", "server", "firewall", "switch", "wifi", "overig"];
    for (const cat of cats) {
      for (const dev of devices[cat] || []) {
        await conn.query(
          `
          INSERT INTO audit_devices
            (audit_id, device_key, category, hostname, os, brand, model, domain_joined, localadmin, user_resp, location, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [
            req.params.id,
            dev.id,
            cat,
            dev.hostname || "",
            dev.os || "",
            dev.brand || "",
            dev.model || "",
            dev.domain_joined || "",
            dev.localadmin || "",
            dev.user || "",
            dev.location || "",
            dev.notes || "",
          ],
        );
      }
    }
    // Insert device checks
    for (const [key, checked] of Object.entries(deviceChecks || {})) {
      // key = deviceKey_checkId
      const lastUnderscore = key.lastIndexOf("_");
      const deviceKey = key.substring(0, lastUnderscore);
      const checkId = key.substring(lastUnderscore + 1);
      if (deviceKey && checkId) {
        await conn.query(
          `
          INSERT INTO audit_device_checks (audit_id, device_key, check_id, checked) VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE checked = VALUES(checked)
        `,
          [req.params.id, deviceKey, checkId, checked ? 1 : 0],
        );
      }
    }
    await conn.commit();
    res.json({ message: "Devices opgeslagen." });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// DELETE /api/audits/:id
router.delete("/:id", async (req, res) => {
  if (req.user.role !== "admin")
    return res
      .status(403)
      .json({ error: "Enkel admins kunnen audits verwijderen." });
  await db.query("DELETE FROM audits WHERE id = ?", [req.params.id]);
  res.json({ message: "Audit verwijderd." });
});

module.exports = router;
