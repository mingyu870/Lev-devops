require('dotenv').config();
const axios = require('axios');
const readline = require('readline');
const dayjs = require('dayjs');

// 슬랙 웹훅 URL 설정
const PRIMARY_SLACK_WEBHOOK_URL = process.env.PRIMARY_SLACK_WEBHOOK_URL
const BACKOFF_SLACK_WEBHOOK_URL = process.env.BACKOFF_SLACK_WEBHOOK_URL

// 슬랙 알림 전송 함수
async function sendSlackNotification(message, color, imageUrl = null, webhookUrl = PRIMARY_SLACK_WEBHOOK_URL) {
  try {
    const attachment = {
      color: color,
      text: message,
    };

    // 이미지가 있는 경우 attachment에 추가
    if (imageUrl) {
      attachment.image_url = imageUrl;
    }

    await axios.post(webhookUrl, {
      attachments: [attachment],
    });
    console.log(`슬랙 알림이 전송되었습니다. (Webhook: ${webhookUrl})`);
  } catch (err) {
    console.error(`슬랙 알림 전송 중 오류 발생  (Webhook: ${webhookUrl}):`, err.message);
  }
}

// Kubernetes 이벤트 처리 함수
function handleEvent(event, eventType) {
  const { kind, reason, regarding, note } = event;

  // 필터링된 이벤트 종류
  const validTriggers = {
    Node: ["NodeReady", "NodeNotReady"],
    Pod: ["Created", "Started", "Killing", "BackOff"],
    ReplicaSet: [
      "SuccessfulCreate",
      "SuccessfulDelete",
      "ScalingReplicaSet",
      "SuccessfulRescale",
    ],
  };

  // 이벤트 필터링
  if (!validTriggers[regarding.kind] || !validTriggers[regarding.kind].includes(reason)) {
    return; // 유효하지 않은 이벤트는 무시
  }

  // 색상 결정
  let color = "#CCCCCC"; // 기본 색상 (회색)
  let imageUrl = null; // 기본 이미지 없음
  if (["Created", "Started", "SuccessfulCreate", "ScalingReplicaSet"].includes(reason)) {
    color = "good"; // 초록색
  } else if (["Delete", "Failed", "Killing", "NodeNotReady", "BackOff"].includes(reason)) {
    color = "danger"; // 빨간색
  }

  // BackOff 이벤트에 이미지를 추가
  if (reason === "BackOff") {
    imageUrl = "https://example.com/exclamation-image.png"; // BackOff 이벤트 이미지 URL
  }

  // 알림 메시지 작성
  const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
  const message = `[SoloLeveling] ${eventType} - ${reason}, ${timestamp}\n` +
    `Name: ${regarding.name}, Namespace: ${regarding.namespace}\n` +
    `Note: ${note || "No additional information."}`;

  // Slack 알림 전송 (기본 Webhook)
  sendSlackNotification(message, color, imageUrl);

  // BackOff 이벤트인 경우 추가 Webhook으로도 알림 전송
  if (reason === "BackOff" || reason === "Created") {
    sendSlackNotification(message, color, imageUrl, BACKOFF_SLACK_WEBHOOK_URL);
  }
}

// Kubernetes 이벤트 스트림 처리
async function watchEvents() {
  try {
    const response = await axios({
      method: 'get',
      url: 'http://127.0.0.1:8001/apis/events.k8s.io/v1/events?watch=true',
      responseType: 'stream',
    });

    const rl = readline.createInterface({
      input: response.data,
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      try {
        const payload = JSON.parse(line);

        // ADDED 또는 MODIFIED 이벤트만 처리
        if (["ADDED", "MODIFIED"].includes(payload.type)) {
          handleEvent(payload.object, payload.type);
        }
      } catch (err) {
        console.error("이벤트 파싱 중 오류 발생:", err.message);
      }
    });

    rl.on('close', () => {
      console.log("Kubernetes 이벤트 스트림이 종료되었습니다.");
    });

  } catch (err) {
    console.error("이벤트 스트림 처리 중 오류 발생:", err.message);
  }
}

// 스크립트 실행
watchEvents();