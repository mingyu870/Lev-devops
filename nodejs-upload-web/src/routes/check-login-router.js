const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  if (req.session && req.session.user) {
    // 세션에 사용자가 존재하면 로그인된 상태로 간주
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    // 로그인되지 않은 상태
    res.json({ loggedIn: false });
  }
});

module.exports = router;