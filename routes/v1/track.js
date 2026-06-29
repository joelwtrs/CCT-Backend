const express = require("express");
const db = require("../../db");
const { authMiddleware } = require("../../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  if (!req.query.user_id)
    return res.status(400).json({ error: "Geen user meegegeven" });

  const user_id = req.query.user_id;
  let condition = "WHERE t.user_id = ?";

  if (req.query.time === "today") {
    condition += " AND DATE(t.contact_date) = CURDATE()";
  } else if (req.query.time === "month") {
    condition += " AND MONTH(t.contact_date) = MONTH(CURDATE())";
  }

  const [tracks] = await db.query(
    `SELECT t.*, c.name as client_name FROM tracks as t JOIN clients as c on t.client_id = c.id ${condition} ORDER BY t.contact_date DESC`,
    [user_id],
  );

  res.json(tracks);
});

router.post("/", async (req, res) => {
  const {
    client_id,
    user_id,
    contactType,
    date,
    startTime,
    endTime,
    question,
    feedback,
  } = req.body;
  if (
    !client_id ||
    !user_id ||
    !contactType ||
    !date ||
    !startTime ||
    !question
  )
    return res.status(400).json({ error: "Verplichte velden niet ingevuld" });

  const [result] = await db.query(
    "INSERT INTO tracks (client_id, user_id, contact_type, contact_date, start_time, end_time, question, feedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      client_id,
      user_id,
      contactType,
      date,
      startTime,
      endTime || null,
      question,
      feedback || null,
    ],
  );
  res.status(201).json({ id: result.insertId });
});

module.exports = router;
