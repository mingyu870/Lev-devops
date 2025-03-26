const express = require("express");
const router = express.Router();

// 로그아웃 처리
router.get("/", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
      throw err;
    }
    res.clearCookie("connect.sid"); // 세션 쿠키 삭제
    res.status(200).json({ message: "로그아웃 성공" });
  });
});

module.exports = router;