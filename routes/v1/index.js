const express = require("express");
const router = express.Router();

const authRoutes = require("./auth");
const usersRoutes = require("./users");
const clientsRoutes = require("./clients.js");
const auditRoutes = require("./audit.js");
const reportRoutes = require("./report.js");
const trackRoutes = require("./track.js");
/**
 * /api/v1
 */

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/clients", clientsRoutes);
router.use("/audits", auditRoutes);
router.use("/reports", reportRoutes);
router.use("/tracks", trackRoutes);

router.get("/", (req, res) => {
  res.sendStatus(403);
});

module.exports = router;
