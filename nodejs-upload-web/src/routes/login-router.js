const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

// 로그인 처리
router.post("/", (req, res) => {
  const { username, password } = req.body; // username 필드 사용

  // 유저 데이터 불러오기
  const dataPath = path.join(__dirname, "../db/users.json");
  const fileData = fs.readFileSync(dataPath, "utf-8");
  const users = JSON.parse(fileData).users;

  // 사용자 찾기 (이메일로 비교)
  const user = users.find((user) => user.email === username); // username으로 사용자 찾기
  if (!user) {
    return res.send(`<script>alert('아이디 혹은 비밀번호가 일치하지 않습니다.'); window.location.href = '/';</script>`);
  }

  // 비밀번호 비교
  if (user.password === password) { // 비밀번호 비교
    // 로그인 성공, 세션에 사용자 정보 저장
    req.session.user = user.email; // email로 저장
    req.session.save((err) => {
      if (err) {
        console.log(err);
        throw err;
      }
      return res.redirect("/upload"); // 로그인 성공 시 /upload 페이지로 리다이렉트
    });
  } else {
    return res
      .status(400)
      .send(`<script>alert('아이디 혹은 비밀번호가 일치하지 않습니다.'); window.location.href = '/';</script>`);
  }
});

module.exports = router;