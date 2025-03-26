const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const multer = require("multer");
const moment = require("moment-timezone");
const { exec } = require("child_process");
const { sessionActive, resetSession } = require("./login");

const router = express.Router();

const UPLOAD_FOLDER = "/tmp/env_uploads";
const LOG_FILE = "/var/log/env_uploader.log";
const WARNING_LOG_FILE = "/var/log/env_uploader_warnings.log"; // 경고 로그 파일
const TARGET_FOLDER = "/var/jenkins_home/env";
const BACKUP_FOLDER = "/var/jenkins_home/env_backups";

const SSH_KEY = "/home/ow.pem";
const REMOTE_USER = "root";
const REMOTE_HOST = "10.10.0.11";
const REMOTE_TARGET_FOLDER = "/var/jenkins_home/env";

const ALLOWED_FOLDERS = [
  "ow-space-block-generator",
  "sl-admin-api",
  "sl-batch",
  "sl-event",
  "sl-front",
  "sl-main-api",
];
const ALLOWED_FILES = ["env.beta", "env.prod", "env.dev", "env.development", "env.production"];

fs.ensureDirSync(UPLOAD_FOLDER);
fs.ensureDirSync(BACKUP_FOLDER);

// ✅ 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { folder } = req.body;
    if (!ALLOWED_FOLDERS.includes(folder)) return cb(new Error("잘못된 폴더 선택"), null);
    const uploadPath = path.join(UPLOAD_FOLDER, folder);
    fs.ensureDirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    if (!ALLOWED_FILES.includes(file.originalname)) return cb(new Error("허용되지 않은 파일명입니다."), null);
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// ✅ 파일 업로드 로그 기록 함수 (경고성 메시지 분리)
const logUploadResult = (folder, filename, status, isWarning = false) => {
  const now = new Date();
  const logEntry = `${now.toISOString().split("T")[0]} ${now.toTimeString().split(" ")[0]} ${folder} ${filename} ${status}\n`;

  if (isWarning) {
    fs.appendFileSync(WARNING_LOG_FILE, logEntry);
  } else {
    fs.appendFileSync(LOG_FILE, logEntry);
  }
};

// ✅ 파일 백업 함수
const backupFile = (folder, filename) => {
  const originalFile = path.join(TARGET_FOLDER, folder, filename);
  if (fs.existsSync(originalFile)) {
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');  // 서버 시간 (백업 파일명에 포함)
    const backupFile = path.join(BACKUP_FOLDER, `${folder}-${filename}-${timestamp}`);
    fs.moveSync(originalFile, backupFile, { overwrite: true });
    return { backupFile, timestamp };  // 백업 파일 경로와 생성 시간을 반환
  }
  return null;
};

// 업로드 페이지
router.get(["/", "/server"], (req, res) => {
  if (!sessionActive()) return res.redirect("/session-expired");
  
  resetSession();

  res.send(`
    <h2> *** sl-space-file-upload *** </h2>
    <p>⏳ 남은 시간: <span id="sessionTime">${180}</span>초</p>

    <form id="uploadForm" enctype="multipart/form-data">
      <label for="folder">폴더 선택:</label>
      <select id="folder" name="folder" required>
        <option value="" disabled selected>--- 폴더를 선택해주세요 ---</option>
        ${ALLOWED_FOLDERS.map(folder => `<option value="${folder}">${folder}</option>`).join('')}
      </select>
      <br><br>
      <input type="file" id="file" name="file" required>
      <br><br>
      <button type="button" onclick="uploadFile()">업로드</button>
    </form>
    
    <br>
    <div id="uploadStatus"></div>

    <h3>⚠️ 경고 로그</h3>
    <div id="warningContainer"> </div>

    <h3>📜 실패 로그출력</h3>
    <div id="logContainer">로딩 중...</div>

    <button onclick="window.location.href='/backupfile'">📜 백업 리스트 보기</button>

    <script>
      let remainingTime = ${180};
      let timerInterval = setInterval(() => {
        remainingTime--;
        document.getElementById("sessionTime").innerText = remainingTime;

        if (remainingTime <= 0) {
          clearInterval(timerInterval);
          alert("세션이 만료되었습니다.");
          location.replace("/session-expired");
        }
      }, 1000);

      async function fetchLogs(page = 1) {
        const response = await fetch("/server/logs?page=" + page);
        const logsHtml = await response.text();
        document.getElementById("logContainer").innerHTML = logsHtml; 
      }
      
      async function fetchBackups() {
        document.getElementById("backupContainer").innerHTML = await (await fetch("/server/backups")).text();
      }

      fetchLogs();
      fetchBackups();
      setInterval(fetchLogs, 10000);
      setInterval(fetchBackups, 10000);

      async function uploadFile() {
        const formData = new FormData();
        const folder = document.getElementById("folder").value;
        const file = document.getElementById("file").files[0];

        if (!folder || !file) {
          document.getElementById("uploadStatus").innerHTML = "<p style='color:red;'>📛 폴더와 파일을 선택하세요.</p>";
          return;
        }

        formData.append("folder", folder);
        formData.append("file", file);

        document.getElementById("uploadStatus").innerHTML = "🔄 업로드 중...";

        const response = await fetch("/server/upload", { method: "POST", body: formData });
        const result = await response.text();

        document.getElementById("uploadStatus").innerHTML = result;
        fetchLogs();
        fetchBackups();
      }
    </script>
  `);
});

// 파일 업로드 엔드포인트
router.post("/upload", upload.single("file"), (req, res) => {
  if (!sessionActive()) return res.send("📛 세션이 만료되었습니다.");

  const { folder } = req.body;
  if (!req.file) return res.send("📛 파일이 없습니다.");

  // 기존 파일 백업
  const backupResult = backupFile(folder, req.file.filename);
  if (backupResult) {
    logUploadResult(folder, req.file.filename, "기존 파일 백업 완료");
  }

  const uploadedFilePath = path.join(UPLOAD_FOLDER, folder, req.file.filename);
  const targetFilePath = path.join(TARGET_FOLDER, folder, req.file.filename);

  // 업로드하기 전에 기존 파일을 백업
  logUploadResult(folder, req.file.filename, "업로드 시도");

  // 기존 파일을 새로 업로드된 파일로 덮어쓰기
  fs.move(uploadedFilePath, targetFilePath, { overwrite: true }, (err) => {
    if (err) {
      logUploadResult(folder, req.file.filename, "파일 이동 실패", true);
      return res.send("파일 이동 실패: " + err.message);
    }

    const scpCommand = `sudo scp -i ${SSH_KEY} ${targetFilePath} ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_TARGET_FOLDER}/${folder}/`;
    exec(scpCommand, (scpErr, stdout, stderr) => {
      if (scpErr) {
        logUploadResult(folder, req.file.filename, `원격 동기화 실패: ${stderr}`, true);
        return res.send("원격 서버 동기화 실패: " + stderr);
      }

      // 동기화 성공시 로깅 및 응답 처리 추가
      logUploadResult(folder, req.file.filename, "원격 동기화 성공");
      res.send("파일이 성공적으로 업로드되었습니다.");
    });
  });
});

// 업로드 로그 페이지
router.get("/logs", (req, res) => {
  if (!sessionActive()) return res.redirect("/session-expired");

  const page = parseInt(req.query.page) || 1;
  const itemsPerPage = 10;
  const logFileExists = fs.existsSync(LOG_FILE);
  const warningLogFileExists = fs.existsSync(WARNING_LOG_FILE);

  let logs = logFileExists ? fs.readFileSync(LOG_FILE, "utf8").split("\n").filter(line => line.trim() !== "") : [];
  let warnings = warningLogFileExists ? fs.readFileSync(WARNING_LOG_FILE, "utf8").split("\n").filter(line => line.trim() !== "") : [];

  logs.reverse();
  warnings.reverse();

  const totalLogs = logs.length;
  const totalPages = Math.ceil(totalLogs / itemsPerPage);
  logs = logs.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const logTable = logs.map(line => {
    const [date, time, folder, filename, ...statusParts] = line.split(" ");
    const status = statusParts.join(" ");
    return `<tr>
      <td>${date}</td>
      <td>${time}</td>
      <td>${folder}</td>
      <td>${filename}</td>
      <td>${status}</td>
    </tr>`;
  }).join("");

  // 경고 로그 스크롤 텍스트 생성
  const warningText = warnings.length > 0 ? `<div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; background-color: #f9f9f9;">
    <p><strong>경고 로그:</strong></p>
    <pre>${warnings.join("\n")}</pre>
  </div>` : " ";

  const pagination = `
    <div class="pagination">
      ${Array.from({ length: totalPages }, (_, index) => {
        const pageIndex = index + 1;
        return `<a href="/server/logs?page=${pageIndex}" ${pageIndex === page ? 'style="font-weight:bold;"' : ""}>${pageIndex}</a>`;
      }).join(" ")}
    </div>
  `;

  res.send(`
    <h2>업로드 로그</h2>
    <table border="1" cellspacing="0" cellpadding="5">
      <thead>
        <tr>
          <th>날짜</th>
          <th>시간</th>
          <th>폴더</th>
          <th>파일명</th>
          <th>상태</th>
        </tr>
      </thead>
      <tbody>
        ${logTable}
      </tbody>
    </table>
    ${pagination}
    <br>
    ${warningText}
  `);
});

module.exports = router;