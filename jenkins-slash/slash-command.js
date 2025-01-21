const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const axios = require('axios');

const app = express();
const port = 3001;

// Jenkins CLI 기본 URL 및 인증 정보 설정
const jenkinsCliCommand = 'java -jar jenkins-cli.jar -s http://43.155.143.149:8080 -auth owjenkins:11da2374f2fcdc1aab4547c8b09687647f';

// Slack Webhook URL (Slack 로그 메시지를 전송할 URL)
const slackWebhookUrl = 'https://hooks.slack.com/services/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';

app.use(bodyParser.urlencoded({ extended: true }));

// 슬랙 로그 메시지 전송 함수
async function sendSlackLog(message) {
    try {
        await axios.post(slackWebhookUrl, { text: message });
    } catch (error) {
        console.error('Error sending Slack log:', error.message);
    }
}

// Slack 명령어 엔드포인트 - Jenkins 빌드 트리거
app.post('/slack/jenkins-build', (req, res) => {
    const userName = req.body.user_name;
    const channelId = req.body.channel_id;
    const jobName = req.body.text?.trim();

    console.log('Request Body:', req.body);

    if (!jobName) {
        return res.send('Usage: /jenkins-build <job-name>');
    }

    sendSlackLog(`User *${userName}* executed \`/jenkins-build ${jobName}\` in channel <#${channelId}>.`);

    // 이전 버전 확인
    const versionCommand = `${jenkinsCliCommand} console ${jobName}/${jobName}-deploy lastBuild | grep -oP 'VERSION: \\K[0-9]+\\.[0-9]+\\.[0-9]+'`;

    exec(versionCommand, (error, stdout, stderr) => {
        if (error) {
            console.error('Error getting previous version:', stderr || error.message);
            return res.send(`Failed to get previous version for job: ${jobName}`);
        }

        let previousVersion = stdout.trim();
        if (!previousVersion) {
            previousVersion = '0.0.0';
        }

        // 버전 증가
        const versionParts = previousVersion.split('.');
        versionParts[2] = (parseInt(versionParts[2]) + 1).toString();
        const newVersion = versionParts.join('.');

        // 새 버전으로 빌드 실행
        const buildCommand = `${jenkinsCliCommand} build ${jobName}/${jobName}-deploy -p VERSION=${newVersion}`;
        
        exec(buildCommand, (buildError, buildStdout, buildStderr) => {
            if (buildError) {
                console.error('Error executing Jenkins build:', buildStderr || buildError.message);
                return res.send(`Failed to trigger Jenkins build for job: ${jobName} with version: ${newVersion}`);
            }

            console.log('Jenkins CLI Output:', buildStdout);
            res.send(`Jenkins build triggered successfully for job: ${jobName} with new version: ${newVersion}`);
        });
    });
});


// 서버 시작
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
