// eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
const express = require("express");
const router = express.Router();

/* GET home page. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});

// eslint-disable-next-line no-undef
module.exports = router;
