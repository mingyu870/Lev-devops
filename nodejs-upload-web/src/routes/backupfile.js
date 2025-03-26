const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

const router = express.Router();
const BACKUP_FOLDER = "/var/jenkins_home/env_backups";

// Slack 웹훅 URL
const SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/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";

// 허용된 IP 목록
const ALLOWED_IPS = ["58.234.153.26"];
const PASSWORD = "Bac!k#e9fi!e"; 
const ALLOWED_USERS = ["lev", "terry", "aesop", "freddie", "tyler", "ben"];
const LOG_FILE = "/var/jenkins_home/access_logs.txt"; 
const OTP_PASS = "19283"; 

// 백업 파일 목록 페이지 (패스워드 및 사용자명 입력을 요구하는 페이지)
router.get("/", (req, res) => {
  const clientIp = req.ip;

  // 클라이언트 IP가 허용된 IP 목록에 있으면 사용자 이름만 입력받는 페이지로 이동
  if (ALLOWED_IPS.includes(clientIp)) {
    return res.send(`
      <form action="/backupfile/verify-ip" method="POST">
        <label for="username">사용자 이름:</label>
        <input type="text" id="username" name="username" required>
        <label for="otp">OTP:</label>
        <input type="text" id="otp" name="otp" required>
        <button type="submit">확인</button>
      </form>
    `);
  }

  // 다른 IP에서 접근하면 사용자명과 패스워드를 입력받는 페이지로 이동
  res.send(`
    <form action="/backupfile/verify" method="POST">
      <label for="username">사용자 이름:</label>
      <input type="text" id="username" name="username" required>
      <label for="password">패스워드를 입력하세요:</label>
      <input type="password" id="password" name="password" required>
      <label for="otp">OTP:</label>
      <input type="text" id="otp" name="otp" required>
      <button type="submit">확인</button>
    </form>
  `);
});

// 허용된 IP에서 사용자명과 OTP 확인 후 백업 파일 목록 페이지
router.post("/verify-ip", (req, res) => {
  const { username, otp } = req.body;

  // 사용자명 확인 및 OTP 확인
  if (ALLOWED_USERS.includes(username) && otp === OTP_PASS) {
    return showBackupFiles(req, res, username); // 유저명이 맞고 OTP가 일치하면 백업 파일 목록을 보여줌
  } else {
    return res.status(403).send("사용자 이름 또는 OTP가 올바르지 않습니다.");
  }
});

// 허용되지 않은 IP에서 사용자명, 패스워드, OTP 확인 후 백업 파일 목록 페이지
router.post("/verify", (req, res) => {
  const { username, password, otp } = req.body;

  // 사용자명, 패스워드 및 OTP 확인
  if (ALLOWED_USERS.includes(username) && password === PASSWORD && otp === OTP_PASS) {
    return showBackupFiles(req, res, username); // 패스워드와 사용자명, OTP가 맞으면 백업 파일 목록을 보여줌
  } else {
    return res.status(403).send("사용자 이름, 패스워드 또는 OTP가 올바르지 않습니다.");
  }
});

// 백업 파일 목록을 보여주는 함수
const showBackupFiles = (req, res, username) => {
  const page = parseInt(req.query.page) || 1;
  const ITEMS_PER_PAGE = 15; 

  try {
    // 백업 폴더에서 파일 목록 가져오기
    let files = fs.readdirSync(BACKUP_FOLDER);

    if (files.length === 0) {
      return res.send(`
        <button onclick="window.location.href='/server'">⬅️ 뒤로 가기</button>
        <h2>📂 백업된 파일 목록</h2>
        <p>백업된 파일이 없습니다.</p>
      `);
    }

    // 파일의 최종 수정 시간 기준으로 정렬
    files = files
      .map(file => ({
        name: file,
        time: fs.statSync(path.join(BACKUP_FOLDER, file)).mtimeMs, // 파일 최종 수정 시간(ms)
      }))
      .sort((a, b) => b.time - a.time) // 최신순 정렬
      .map(file => file.name); // 정렬 후 파일 이름만 가져오기

    // 최신 3개 파일 강조
    const top3Files = files.slice(0, 3);

    // 페이지네이션 적용
    const paginatedFiles = files.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(files.length / ITEMS_PER_PAGE);

    // HTML 파일 목록 생성
    const fileListHtml = paginatedFiles
      .map(file => {
        const isHighlighted = top3Files.includes(file);
        return `<li><span style="color: ${isHighlighted ? 'red' : 'black'}; font-weight: ${isHighlighted ? 'bold' : 'normal'};">${file}</span> - <a href="/backupfile/download?file=${file}&user=${username}">📥 다운로드</a></li>`;
      })
      .join("");

    // ⬅페이지 이동 버튼
    const prevPage = page > 1 ? `<button onclick="window.location.href='/backupfile?page=${page - 1}'">⬅️ 이전</button>` : "";
    const nextPage = page < totalPages ? `<button onclick="window.location.href='/backupfile?page=${page + 1}'">다음 ➡️</button>` : "";

    // 최종 HTML 응답
    res.send(`
      <button onclick="window.location.href='/server'">⬅️ 뒤로 가기</button>
      <h2>📂 백업된 파일 목록</h2>
      <ul>${fileListHtml}</ul>
      <br>
      ${prevPage} ${nextPage}
      <script>
        // 30초 후에 /session-expired 페이지로 리디렉션
        setTimeout(function() {
          window.location.href = '/session-expired';
        }, 30000); // 30초 = 30000ms
      </script>
    `);
  } catch (err) {
    console.error("❌ 백업 폴더를 읽는 중 오류 발생:", err);
    res.status(500).send("서버 내부 오류 발생");
  }
};

// 백업 파일 다운로드
router.get("/download", (req, res) => {
  const { file, user } = req.query;
  const filePath = path.join(BACKUP_FOLDER, file);
  if (!fs.existsSync(filePath)) return res.status(404).send("파일이 존재하지 않습니다.");

  // 로그 파일에 접속 기록 추가
  const logEntry = `${new Date().toISOString()} - 사용자: ${user} - 다운로드 파일: ${file}\n`;
  fs.appendFileSync(LOG_FILE, logEntry);

  // Slack 알림 전송
  const slackMessage = {
    text: ` *env_backupfile 다운로드 감지*\n 사용자: ${user}\n 파일명: ${file}\n 시간: ${new Date().toLocaleString()}`
  };

  axios.post(SLACK_WEBHOOK_URL, slackMessage)
    .then(() => console.log(" Slack 알림 전송 완료"))
    .catch(err => console.error(" Slack 알림 전송 실패:", err));

  res.download(filePath);
});

// 세션 만료 페이지
router.get("/session-expired", (req, res) => {
  res.send(`
    <h2>세션 만료</h2>
    <p>세션이 만료되었습니다. 다시 로그인해 주세요.</p>
    <a href="/login">로그인 페이지로 가기</a>
  `);
});

// 로그인 페이지
router.get("/login", (req, res) => {
  res.send(`
    <h2>로그인 페이지</h2>
    <p>다시 로그인하세요.</p>
    <form action="/backupfile/verify" method="POST">
      <label for="username">사용자 이름:</label>
      <input type="text" id="username" name="username" required>
      <label for="password">패스워드를 입력하세요:</label>
      <input type="password" id="password" name="password" required>
      <label for="otp">OTP:</label>
      <input type="text" id="otp" name="otp" required>
      <button type="submit">확인</button>
    </form>
  `);
});

module.exports = router;