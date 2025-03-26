const express = require("express");
const router = express.Router();

const BASIC_AUTH_USER = "admin";
const BASIC_AUTH_PASS = "password123";

let sessionActive = false;
let sessionTimer = null;
const SESSION_TIMEOUT_SECONDS = 180;
let sessionTimeLeft = SESSION_TIMEOUT_SECONDS;

const startSession = () => {
  sessionActive = true;
  sessionTimeLeft = SESSION_TIMEOUT_SECONDS;

  if (sessionTimer) clearInterval(sessionTimer);
  sessionTimer = setInterval(() => {
    sessionTimeLeft--;
    if (sessionTimeLeft <= 0) {
      sessionActive = false;
      clearInterval(sessionTimer);
    }
  }, 1000);
};

router.get("/", (req, res) => {
  res.send(`
    <h2>🔑 로그인</h2>
    <form action="/login" method="post">
      <label>아이디: <input type="text" name="username" required></label><br><br>
      <label>비밀번호: <input type="password" name="password" required></label><br><br>
      <input type="submit" value="로그인">
    </form>
  `);
});

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === BASIC_AUTH_USER && password === BASIC_AUTH_PASS) {
    startSession();
    res.redirect("/server");
  } else {
    res.send("<h3>❌ 로그인 실패!</h3><a href='/'>다시 시도하기</a>");
  }
});

router.get("/session-expired", (req, res) => {
  res.send(`
    <h2>⏳ 세션이 만료되었습니다</h2>
    <p>다시 로그인해주세요.</p>
    <a href="/">로그인 페이지로 이동</a>
  `);
});

// ✅ router만 내보내기
module.exports = { router };

// ✅ 세션 관리 함수 따로 내보내기
module.exports.sessionActive = () => sessionActive;
module.exports.resetSession = startSession;