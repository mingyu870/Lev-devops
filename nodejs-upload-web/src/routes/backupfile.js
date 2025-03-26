const express = require("express");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const moment = require("moment-timezone");

const router = express.Router();

// 원격 Jenkins 서버 정보
const JENKINS_SERVER = "10.10.0.11";
const BACKUP_FOLDER = "/var/jenkins_home/env_backups";
const SSH_KEY = "/home/ow.pem";
const REMOTE_USER = "root";
const DOWNLOAD_LOG = "/var/jenkins_home/env_downloads.log"; // 다운로드 기록 파일

// ✅ 파일 및 폴더 목록 가져오기
router.get("/", (req, res) => {
  const currentPath = req.query.path ? path.join(BACKUP_FOLDER, req.query.path) : BACKUP_FOLDER;
  const sshCommand = `ssh -i ${SSH_KEY} -q ${REMOTE_USER}@${JENKINS_SERVER} "ls ${currentPath}"`;

  exec(sshCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(" SSH 실행 오류:", stderr);
      return res.status(500).send(" 백업 파일을 불러오는 중 오류가 발생했습니다.");
    }

    const items = stdout
      .trim()
      .split("\n")
      .map(name => ({
        name,
        isDirectory: !name.includes(".") // 확장자가 없으면 폴더로 간주
      }));

    // ✅ 폴더 먼저 정렬 후 최신순 정렬
    items.sort((a, b) => (a.isDirectory && !b.isDirectory ? -1 : b.isDirectory && !a.isDirectory ? 1 : 0));

    // ✅ 페이지네이션 처리
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = 10;
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const paginatedItems = items.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    // ✅ 다운로드 이력 불러오기
    let downloadHistory = "<ul>";
    if (fs.existsSync(DOWNLOAD_LOG)) {
      const logs = fs.readFileSync(DOWNLOAD_LOG, "utf8").trim().split("\n").slice(-10).reverse();
      downloadHistory += logs
        .map(log => {
          const [date, user, filename] = log.split(" | ");
          return `<li><strong>${date}</strong> | ${user} | ${filename}</li>`;
        })
        .join("");
    }
    downloadHistory += "</ul>";

    // ✅ 파일 및 폴더 리스트 HTML 생성
    const fileListHTML = paginatedItems.map(item =>
      item.isDirectory
        ? `<li><a href="/backupfile?path=${encodeURIComponent(req.query.path ? req.query.path + '/' + item.name : item.name)}">${item.name}</a></li>`
        : `<li>${item.name} <a href="/backupfile/download?path=${encodeURIComponent(req.query.path ? req.query.path + '/' + item.name : item.name)}"> 다운로드</a></li>`
    ).join("");

    // ✅ 현재 경로 표시 및 상위 폴더 이동 버튼
    const currentPathDisplay = `<p>현재 경로: ${req.query.path || "Root"}</p>`;
    const parentPath = req.query.path
      ? `<button onclick="window.location.href='/backupfile?path=${encodeURIComponent(path.dirname(req.query.path))}'" class="back-btn">⬅ 상위 폴더</button>`
      : "";

    // ✅ 페이지네이션 UI
    let paginationHTML = "";
    if (totalPages > 1) {
      paginationHTML = `<div class="pagination">`;
      for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `<a href="/backupfile?path=${encodeURIComponent(req.query.path || "")}&page=${i}" class="${i === page ? 'active' : ''}">${i}</a>`;
      }
      paginationHTML += `</div>`;
    }

    // ✅ HTML 응답
    res.send(`
      <html>
      <head>
        <title>Jenkins 백업 리스트</title>
        <style>
          body { background-color: #000; color: white; font-family: Arial, sans-serif; text-align: center; margin: 0; padding: 20px; }
          .container { max-width: 700px; margin: 0 auto; padding: 15px; background: #222; border-radius: 10px; }
          ul { list-style: none; padding: 0; margin: 0; }
          li { padding: 8px; border-bottom: 1px solid #444; display: flex; justify-content: space-between; align-items: center; }
          li a { text-decoration: none; color: cyan; }
                    .download { color: yellow; text-decoration: none; padding: 3px 8px; border: 1px solid yellow; border-radius: 5px; font-size: 14px; }
          .download:hover { background-color: yellow; color: black; }
          .pagination { margin-top: 10px; display: flex; justify-content: center; gap: 5px; }
          .pagination a { color: white; padding: 5px 8px; text-decoration: none; border: 1px solid white; border-radius: 5px; font-size: 14px; }
          .pagination a.active { font-weight: bold; color: red; border-color: red; }
          .back-btn { margin: 10px 0; padding: 5px 10px; background: transparent; color: cyan; border: none; cursor: pointer; font-size: 14px; }
          .close-btn { margin-top: 20px; background: transparent; color: white; border: none; cursor: pointer; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2> env_backup list </h2>
          ${currentPathDisplay}
          ${parentPath}
          <ul>${fileListHTML}</ul>
          ${paginationHTML}
          <h3>다운로드 이력</h3>
          ${downloadHistory}
          <button class="close-btn" onclick="window.location.href='/upload'">닫기</button>
        </div>
      </body>
      </html>
    `);
  });
});

// ✅ 개별 백업 파일 다운로드
router.get("/download", (req, res) => {
  const { path: filePath } = req.query;
  const remoteFilePath = `${BACKUP_FOLDER}/${filePath}`;
  const localTempPath = `/tmp/${path.basename(filePath)}`;
  const user = req.session.user || "Unknown";
  const timestamp = moment().tz("Asia/Seoul").format("YYYY-MM-DD HH:mm:ss");


  const scpCommand = `scp -i ${SSH_KEY} ${REMOTE_USER}@${JENKINS_SERVER}:${remoteFilePath} ${localTempPath}`;

  exec(scpCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`🚨 파일 다운로드 실패: ${stderr}`);
      return res.status(500).send("파일을 가져오는 중 오류가 발생했습니다.");
    }

    console.log("✅ 파일 다운로드 성공:", localTempPath);
    const logEntry = `${timestamp} | ${user} | ${filePath}\n`;
    fs.appendFileSync(DOWNLOAD_LOG, logEntry, "utf8");

    res.download(localTempPath, (err) => {
      if (err) {
        console.error("🚨 파일 전송 오류:", err);
        res.status(500).send("파일 전송 중 오류 발생");
      }
      exec(`rm -f ${localTempPath}`);
    });
  });
});

module.exports = router;