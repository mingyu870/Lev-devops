const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const multer = require("multer");
const moment = require("moment-timezone");
const { exec } = require("child_process");

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
  "sl-bo",
  "sl-main-api",
];
const ALLOWED_FILES = ["env.beta", "env.prod", "env.dev", "env.development", "env.production"];

fs.ensureDirSync(UPLOAD_FOLDER);
fs.ensureDirSync(BACKUP_FOLDER);

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { folder } = req.body;
    if (!ALLOWED_FOLDERS.includes(folder)) return cb(new Error("잘못된 폴더 선택"), null);
    const uploadPath = path.join(UPLOAD_FOLDER, folder);
    fs.ensureDirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

// 파일 업로드 로그 기록 함수 (경고성 메시지 분리)
const logUploadResult = (user, folder, filename, status, isWarning = false) => {
  const now = new Date();
  const logEntry = `${now.toISOString().split("T")[0]} ${now.toTimeString().split(" ")[0]} ${user} ${folder} ${filename} ${status}\n`;

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

// 파일 업로드 폼 출력
router.get(["/", "/upload"], (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login"); // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  }
  // 로그인한 사용자 정보가 올바르게 전달되는지 확인
  console.log('로그인한 사용자:', req.session.user);
  res.send(`
    <html>
      <head>
        <title>sl-space-file-upload</title>
        <style>
          body {
            background-color: #000;
            color: white;
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            background-color: #222;
            border-radius: 10px;
            box-shadow: 0px 0px 15px rgba(255, 255, 255, 0.2);
	    position: relative;
          }
          .title {
            text-align: center;
            margin-bottom: 20px;
          }
          .session-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .upload-form {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .form-group {
            margin-bottom: 20px;
            width: 100%;
          }
          .form-group label {
            display: block;
            margin-bottom: 5px;
          }
          select, input[type="file"] {
            width: 100%;
            padding: 10px;
            margin-bottom: 10px;
            border: none;
            border-radius: 5px;
            background-color: #333;
            color: white;
          }
          button[type="button"] {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            background-color: #none;
            color: white;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            transition: 0.3s;
          }
          button[type="button"]:hover {
            background-color: #0056b3;
          }
          .status-container {
            margin-top: 20px;
          }
          .log-container {
            margin-top: 20px;
          }
          .backup-button {
            margin-top: 20px;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            background-color: #none;
            color: white;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            transition: 0.3s;
          }
          .backup-button:hover {
            background-color: #0056b3;
          }
          .history-button {
            position: absolute;
            bottom: 10px;
            right: 10px;
          }
          h2, h3 {
            color: #7d7a7d;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!--  로그아웃 버튼 -->
          <button class="logout-btn" onclick="logout()"> 로그아웃</button>

          <h2 class="title">*** sl-space-file-upload ***</h2>
          <div class="session-info">
            <p>⏳ 남은 시간: <span id="sessionTime">${18000}</span>초</p>
            <p>로그인한 사용자: ${req.session.user}</p>  
          </div>

          <form id="uploadForm" enctype="multipart/form-data" class="upload-form">
            <div class="form-group">
              <label for="folder">폴더 선택:</label>
              <select id="folder" name="folder" required>
                <option value="" disabled selected>--- 폴더를 선택해주세요 ---</option>
                ${ALLOWED_FOLDERS.map(folder => `<option value="${folder}">${folder}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="file">파일 선택:</label>
              <input type="file" id="file" name="file" required>
            </div>
            <button type="button" onclick="uploadFile()">업로드</button>
          </form>

          <div class="log-container">
            <h3> 실패 로그출력</h3>
            <div id="logContainer"></div>
          </div>

          <button class="backup-button" onclick="window.location.href='/backupfile'"> 백업 리스트</button>
        </div>
        <script>
          let remainingTime = ${18000};
          let timerInterval = setInterval(() => {
            remainingTime--;
            document.getElementById("sessionTime").innerText = remainingTime;
            if (remainingTime <= 0) {
              clearInterval(timerInterval);
              alert("세션이 만료되었습니다.");
              location.replace("/session-expired");
            }
          }, 1000);

          async function logout() {
            try {
              const response = await fetch("/logout", { method: "GET" }); // 서버로 로그아웃 요청 보내기
              if (response.ok) {
                alert("로그아웃되었습니다.");
                window.location.href = "/"; // 홈으로 리디렉트
              } else {
                alert("로그아웃 실패. 다시 시도해주세요.");
              }
            } catch (error) {
              console.error("로그아웃 중 오류 발생:", error);
              alert("로그아웃 중 오류가 발생했습니다.");
            }
          }

          async function fetchLogs(page = 1) {
            const response = await fetch("/upload/logs?page=" + page);
            const logsHtml = await response.text();
            document.getElementById("logContainer").innerHTML = logsHtml; 
          }

          async function fetchBackups() {
            document.getElementById("backupContainer").innerHTML = await (await fetch("/upload/backups")).text();
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
            const response = await fetch("/upload", { method: "POST", body: formData });
            const result = await response.text();
            alert(result);

            document.getElementById("uploadStatus").innerHTML = result;
            fetchLogs();
            fetchBackups();
          }
        </script>
        <style>
          /* 🔹 투명한 로그아웃 버튼 스타일 */
          .logout-btn {
            position: absolute;
            top: 20px;
            right: 20px;
            background: transparent;
            color: white;
            border: none;
            padding: 10px 15px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            border-radius: 5px;
            transition: all 0.3s ease;
          }

          .logout-btn:hover {
            text-decoration: underline;
            transform: scale(1.05);
          }
        </style>
      </body>
    </html>
  `);
});
// ✅ 파일 업로드 엔드포인트
router.post("/", upload.single("file"), async (req, res) => {
  if (!req.session.user) return res.send("📛 세션이 만료되었습니다.");

  const user = req.session.user;
  const { folder } = req.body;
  if (!req.file) return res.send("📛 파일이 없습니다.");

  const existingFilePath = path.join(REMOTE_TARGET_FOLDER, folder, req.file.filename);
  const targetFilePath = path.join(REMOTE_TARGET_FOLDER, folder, req.file.filename);

  try {
    // ✅ 기존 파일이 존재하면 백업 먼저 수행
    if (fs.existsSync(existingFilePath)) {
      await backupFileToJenkins(folder, req.file.filename);
    }

    // ✅ 신규 파일 업로드 (기존 파일 덮어쓰기)
    await fs.move(req.file.path, targetFilePath, { overwrite: true });

    // ✅ 원격 서버에 파일 동기화
    const scpCommand = `sudo scp -i ${SSH_KEY} ${targetFilePath} ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_TARGET_FOLDER}/${folder}/`;
    exec(scpCommand, (scpErr, stdout, stderr) => {
      if (scpErr) {
        console.error("🚨 원격 동기화 실패:", stderr);
        logUploadResult(user, folder, req.file.filename, "원격 동기화 실패", true); 
        return res.send("🚨 원격 서버 동기화 실패: " + stderr);
      }

      console.log("✅ 파일 업로드 및 동기화 성공");
      logUploadResult(user, folder, req.file.filename, "업로드 성공"); // 성공 로그
      res.send("✅ 파일이 성공적으로 업로드되었습니다.");
    });
  } catch (error) {
    console.error("🚨 파일 업로드 중 오류 발생:", error);
    logUploadResult(user, folder, req.file.filename, "업로드 실패", true); // 경고 로그
    res.status(500).send("🚨 파일 업로드 중 오류 발생");
  }
});

// ✅ 기존 파일을 젠킨스 서버에 백업
async function backupFileToJenkins(folder, filename) {
  const backupPath = `${BACKUP_FOLDER}/${folder}`;

  console.log(`📂 기존 파일 백업 중: ${filename}`);

  return new Promise((resolve, reject) => {
    const sshCommand = `
      ssh -i ${SSH_KEY} ${REMOTE_USER}@${REMOTE_HOST} "
        mkdir -p ${backupPath} &&
        timestamp=\\$(TZ='Asia/Seoul' date +'%H%M%S_%d%m%Y') &&  # 🟢 KST 시간 적용
        backupFilename=${filename}_\\$timestamp.bak &&
        cp ${REMOTE_TARGET_FOLDER}/${folder}/${filename} ${backupPath}/\\$backupFilename &&
        echo \\$backupFilename
      "
    `;

    exec(sshCommand, (err, stdout, stderr) => {
      if (err) {
        console.error("🚨 백업 실패:", stderr);
        reject(stderr);
      } else {
        const backupFilename = stdout.trim(); // ✅ 원격에서 생성된 파일명 가져오기
        console.log(`✅ 백업 성공: ${backupFilename}`); // ✅ 실제 생성된 파일명 출력
        resolve(backupFilename);
      }
    });
  });
}


// 업로드 로그 페이지
router.get("/logs", (req, res) => {
  if (!req.session.user) return res.redirect("/login");

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
    const [date, time, user, folder, filename, ...statusParts] = line.split(" ");
    const status = statusParts.join(" ");
    return `<tr>
      <td>${date}</td>
      <td>${time}</td>
      <td>${user}</td>
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
        return `<a href="/upload/logs?page=${pageIndex}" ${pageIndex === page ? 'style="font-weight:bold;"' : ""}>${pageIndex}</a>`;
      }).join(" ")}
    </div>
  `;

  // 페이지네이션 적용
  const maxPagesToShow = 5;
  let paginationHTML = `<div class="pagination">`;

  const startPage = Math.floor((page - 1) / maxPagesToShow) * maxPagesToShow + 1;
  const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (startPage > 1) {
    paginationHTML += `<a href="/upload/logs?page=${startPage - 1}" class="prev"><<</a>`;
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `<a href="/upload/logs?page=${i}" class="${i === page ? 'active' : ''}" style="${i === page ? 'font-weight: bold; color: red;' : ''}">${i}</a>`;
  }

  if (endPage < totalPages) {
    paginationHTML += `<a href="/upload/logs?page=${endPage + 1}" class="next">>></a>`;
  }

  paginationHTML += `</div>`;

  res.send(`
    <html>
    <head>
      <title>업로드 로그</title>
      <style>
        body {
          background-color: #000;
          color: white;
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          text-align: center;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: #222;
          border-radius: 10px;
          box-shadow: 0px 0px 15px rgba(255, 255, 255, 0.2);
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          background: #333;
          color: white;
        }
        th, td {
          padding: 10px;
          border: 1px solid #555;
          text-align: center;
        }
        th {
          background-color: #444;
        }
        .pagination {
          margin-top: 20px;
        }
        .pagination a {
          color: white;
          padding: 5px 8px;
          margin: 0 3px;
          text-decoration: none;
          border: 1px solid white;
          border-radius: 5px;
          font-size: 14px;
        }
        .pagination a.active {
          font-weight: bold;
          color: red;
          border-color: red;
        }
        .pagination a.next, .pagination a.prev {
          font-size: 16px;
          font-weight: bold;
        }
        .warning-log {
          margin-top: 20px;
          padding: 10px;
          background: #880000;
          color: white;
          border-radius: 5px;
          max-height: 300px;
          overflow-y: auto;
        }
      .close-btn {
        background: transparent;
        color: white;
        border: none;
        padding: 8px 12px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        border-radius: 5px;
        transition: all 0.3s ease;
        position: absolute;
        top: 20px;
        right: 20px;
      }
      </style>
    </head>
    <body>
      <div class="container">
        <h2> 업로드 로그</h2>
        <table>
          <thead>
            <tr>
              <th>날짜</th>
              <th>시간</th>
              <th>유저</th>
              <th>폴더</th>
              <th>파일명</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            ${logTable}
          </tbody>
        </table>
        ${paginationHTML}
        <br>
        ${warningText}
        <button class="close-btn" onclick="window.location.href='/upload'">닫기</button>
      </div>
      <script>
      	document.addEventListener("DOMContentLoaded", function () {
          // 현재 URL이 "/upload/logs"가 아니라면 닫기 버튼 숨김
          if (window.location.pathname !== "/upload/logs") {
            document.querySelector(".close-btn").style.display = "none";
        }
      });
    </script>
    </body>
    </html>
  `);
});

module.exports = router;