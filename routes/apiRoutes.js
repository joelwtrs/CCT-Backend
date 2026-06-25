const express = require("express");
const router = express.Router();

const v1Routes = require("./v1/index");
/**
 * /api/v1
 */

router.use("/v1", v1Routes);

router.get("/", (req, res) => {
  res.sendStatus(403);
});

module.exports = router;
