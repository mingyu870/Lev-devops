const fs = require("fs");
const axios = require("axios");
const chokidar = require("chokidar");

// 🔴 Slack Webhook URL (Slack에서 받은 Webhook URL로 변경하세요!)
const SLACK_WEBHOOK_URL = "slcak hook url";


// 🔴 PM2 로그 파일 경로 (실제 로그 파일 경로로 변경 필요)
const PM2_LOG_FILE = "/root/.pm2/logs/app-out.log"; 

// ✅ Slack으로 메시지 전송
async function sendToSlack(message) {
  try {
    await axios.post(SLACK_WEBHOOK_URL, { text: `🟢 *upload server 로그인 감지*\n>>> ${message}` });
    console.log("✅ Slack으로 메시지를 전송했습니다.");
  } catch (error) {
    console.error("🚨 Slack 메시지 전송 실패:", error);
  }
}

// ✅ 로그 파일 실시간 감지 (이전 로그 무시)
function watchLogFile() {
  console.log("🚀 PM2 로그 감지 시작...");
  
  const watcher = chokidar.watch(PM2_LOG_FILE, { persistent: true, usePolling: true, interval: 1000 });

  watcher.on("change", () => {
    const stream = fs.createReadStream(PM2_LOG_FILE, { encoding: "utf8" });
    
    stream.on("data", (chunk) => {
      const lines = chunk.trim().split("\n");
      const lastLine = lines[lines.length - 1]; // 🔥 마지막 로그 한 줄만 확인

      if (lastLine.includes("로그인한 사용자:")) {
        console.log("🔍 감지된 로그:", lastLine);
        sendToSlack(lastLine);
      }
    });

    stream.on("error", (err) => console.error("🚨 로그 파일 읽기 오류:", err));
  });

  watcher.on("error", (err) => console.error("🚨 로그 감시 오류:", err));
}

// 실행
watchLogFile();