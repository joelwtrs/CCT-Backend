const express = require("express");
const db = require("../../db");
const { authMiddleware } = require("../../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// GET /api/reports/:auditId — samenvatting voor rapport
router.get("/:auditId", async (req, res) => {
  const [audits] = await db.query(
    `
    SELECT a.*, c.name AS client_name, c.contact, c.email AS client_email,
           u.name AS auditor_name
    FROM audits a
    JOIN clients c ON c.id = a.client_id
    JOIN users   u ON u.id = a.created_by
    WHERE a.id = ?
  `,
    [req.params.auditId],
  );

  if (!audits.length)
    return res.status(404).json({ error: "Audit niet gevonden." });

  const [stats] = await db.query(
    `
    SELECT
      COUNT(*) AS total,
      SUM(r.status = 'ok')   AS ok_count,
      SUM(r.status = 'nok')  AS nok_count,
      SUM(r.status = 'na')   AS na_count,
      SUM(r.status = 'open') AS open_count,
      SUM(ci.risk_level = 'H' AND r.status = 'nok') AS high_risk_nok,
      SUM(ci.risk_level = 'M' AND r.status = 'nok') AS mid_risk_nok,
      SUM(ci.risk_level = 'L' AND r.status = 'nok') AS low_risk_nok
    FROM audit_responses r
    JOIN checklist_items ci ON ci.id = r.checklist_item_id
    WHERE r.audit_id = ?
  `,
    [req.params.auditId],
  );

  const [nok_items] = await db.query(
    `
    SELECT ci.question, ci.risk_level, cat.name AS category, r.remark
    FROM audit_responses r
    JOIN checklist_items ci ON ci.id = r.checklist_item_id
    JOIN categories cat ON cat.id = ci.category_id
    WHERE r.audit_id = ? AND r.status = 'nok'
    ORDER BY FIELD(ci.risk_level,'H','M','L'), cat.sort_order
  `,
    [req.params.auditId],
  );

  res.json({
    audit: audits[0],
    stats: stats[0],
    nok_items,
  });
});

module.exports = router;
