const express = require("express");
const db = require("../../db");
const { authMiddleware, adminOnly } = require("../../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// GET /api/clients
router.get("/", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM clients WHERE active = 1 ORDER BY name");
  res.json(rows);
});

// GET /api/clients/:id
router.get("/:id", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM clients WHERE id = ? AND active = 1", [
    req.params.id,
  ]);
  if (!rows.length)
    return res.status(404).json({ error: "Klant niet gevonden." });
  res.json(rows[0]);
});

// POST /api/clients
router.post("/", async (req, res) => {
  const { name, contact, email, phone, address } = req.body;
  if (!name) return res.status(400).json({ error: "Naam is verplicht." });

  const [result] = await db.query(
    "INSERT INTO clients (name, contact, email, phone, address) VALUES (?, ?, ?, ?, ?)",
    [name, contact || null, email || null, phone || null, address || null],
  );
  res.status(201).json({ id: result.insertId, name });
});

// PUT /api/clients/:id
router.put("/:id", async (req, res) => {
  const { name, contact, email, phone, address } = req.body;
  await db.query(
    "UPDATE clients SET name=?, contact=?, email=?, phone=?, address=? WHERE id=?",
    [
      name,
      contact || null,
      email || null,
      phone || null,
      address || null,
      req.params.id,
    ],
  );
  res.json({ message: "Klant bijgewerkt." });
});

// DELETE /api/clients/:id (admin only) — soft delete
router.delete("/:id", adminOnly, async (req, res) => {
  await db.query("UPDATE clients SET active = 0 WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
