const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  return res
    .status(200)
    .json({ message: "유저 조회 성공", user: req.session.user });
});

module.exports = router;