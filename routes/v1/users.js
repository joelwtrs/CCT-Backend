const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../../db");
const { authMiddleware, adminOnly } = require("../../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// GET /api/users — lijst (admin only)
router.get("/", adminOnly, async (req, res) => {
  const [rows] = await db.query(
    "SELECT id, name, email, role, active, created_at FROM users ORDER BY name",
  );
  res.json(rows);
});

// POST /api/users — aanmaken (admin only)
router.post("/", adminOnly, async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password)
    return res
      .status(400)
      .json({ error: "Naam, e-mail en wachtwoord zijn verplicht." });
  if (password.length < 8)
    return res
      .status(400)
      .json({ error: "Wachtwoord moet minimaal 8 tekens bevatten." });

  const validRoles = ["admin", "user"];
  const userRole = validRoles.includes(role) ? role : "user";

  try {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashed, userRole],
    );
    res.status(201).json({ id: result.insertId, name, email, role: userRole });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ error: "E-mailadres is al in gebruik." });
    throw err;
  }
});

// PUT /api/users/:id — bijwerken (admin only)
router.put("/:id", adminOnly, async (req, res) => {
  const { name, email, role, active, password } = req.body;
  const fields = [];
  const values = [];

  if (name) {
    fields.push("name = ?");
    values.push(name);
  }
  if (email) {
    fields.push("email = ?");
    values.push(email);
  }
  if (role && ["admin", "user"].includes(role)) {
    fields.push("role = ?");
    values.push(role);
  }
  if (active !== undefined) {
    fields.push("active = ?");
    values.push(active ? 1 : 0);
  }
  if (password && password.length >= 8) {
    const hashed = await bcrypt.hash(password, 10);
    fields.push("password = ?");
    values.push(hashed);
  }

  if (!fields.length)
    return res.status(400).json({ error: "Geen velden om bij te werken." });

  values.push(req.params.id);
  await db.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
  res.json({ message: "Gebruiker bijgewerkt." });
});

// DELETE /api/users/:id (admin only, niet zichzelf)
router.delete("/:id", adminOnly, async (req, res) => {
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: "Je kan jezelf niet verwijderen." });
  await db.query("UPDATE users SET active = 0 WHERE id = ?", [req.params.id]);
  res.json({ message: "Gebruiker gedeactiveerd." });
});

module.exports = router;
