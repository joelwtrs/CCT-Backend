const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../../db");
const { authMiddleware } = require("../../middleware/auth");

const router = express.Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res
      .status(400)
      .json({ error: "E-mail en wachtwoord zijn verplicht." });

  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ? AND active = 1",
      [email],
    );
    if (!rows.length)
      return res
        .status(401)
        .json({ error: "Ongeldig e-mailadres of wachtwoord." });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res
        .status(401)
        .json({ error: "Ongeldig e-mailadres of wachtwoord." });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Serverfout." });
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req, res) => {
  const [rows] = await db.query(
    "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
    [req.user.id],
  );
  if (!rows.length)
    return res.status(404).json({ error: "Gebruiker niet gevonden." });
  res.json(rows[0]);
});

// POST /api/auth/change-password
router.post("/change-password", authMiddleware, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res
      .status(400)
      .json({ error: "Beide wachtwoorden zijn verplicht." });
  if (new_password.length < 8)
    return res
      .status(400)
      .json({ error: "Nieuw wachtwoord moet minimaal 8 tekens bevatten." });

  const [rows] = await db.query("SELECT password FROM users WHERE id = ?", [
    req.user.id,
  ]);
  const valid = await bcrypt.compare(current_password, rows[0].password);
  if (!valid)
    return res.status(401).json({ error: "Huidig wachtwoord is onjuist." });

  const hashed = await bcrypt.hash(new_password, 10);
  await db.query("UPDATE users SET password = ? WHERE id = ?", [
    hashed,
    req.user.id,
  ]);
  res.json({ message: "Wachtwoord succesvol gewijzigd." });
});

module.exports = router;
