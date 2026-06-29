const express = require("express");
const db = require("../../db");
const { authMiddleware } = require("../../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

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
