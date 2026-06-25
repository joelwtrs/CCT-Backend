const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ error: "Geen token meegegeven." });

  const token = header.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Ongeldig token formaat." });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token ongeldig of verlopen." });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Enkel admins hebben toegang." });
  }
  next();
}

module.exports = { authMiddleware, adminOnly };
