const axios = require('axios');
const fs = require('fs');

const apiKey = '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'; // Perplexity API 키를 여기에 입력하세요

const trivyData = JSON.parse(fs.readFileSync('/root/trivy/trivy-reports/trivy_results-0306.json', 'utf8'));

const vulnerabilities = [];
for (const item of trivyData.items) {
  for (const vuln of item.report.vulnerabilities) {
    if (vuln.severity === 'CRITICAL') {

      vuln.resourceName = item.metadata.labels["trivy-operator.resource.name"];
      
      if (vuln.resourceName && vuln.resourceName.startsWith('sl-') && !vuln.resourceName.startsWith('sl-event-prod')) {
        vulnerabilities.push(vuln);
      }
    }
  }
}

const prompt = `다음 취약점 리스트를 분석하고 해결 방안을 추천해 주세요:\n\n${JSON.stringify(vulnerabilities, null, 2)}`;

axios.post('https://api.perplexity.ai/chat/completions', {
  model: 'sonar-pro',
  messages: [
    {
      role: 'system',
      content: 'Be precise and concise.'
    },
    {
      role: 'user',
      content: prompt 
    }
  ],
  max_tokens: 1000,
  temperature: 0.7,
}, {
  headers: {
    'Authorization': `Bearer ${apiKey}`, 
    'Content-Type': 'application/json',
  },
})
  .then(response => {
    const aiResponse = response.data.choices[0].message.content;

    const slackMessage = {
      text: '[ 취약점 경고] HIGH 또는 CRITICAL 취약점이 감지되었습니다!',
      attachments: vulnerabilities.map(vuln => ({
        title: `리소스: ${vuln.resourceName}`,
        text: `Severity: ${vuln.severity}\n타이틀: ${vuln.title}\n취약점 ID: ${vuln.vulnerabilityID}\n설치된 버전: ${vuln.installedVersion}`,
      })),
    };

    slackMessage.attachments.push({
      title: 'AI 분석 결과',
      text: aiResponse,
    });

    const slackWebhookUrl = 'https://hooks.slack.com/services/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';

    axios.post(slackWebhookUrl, slackMessage)
      .then(slackResponse => {
        if (slackResponse.status === 200) {
          console.log('슬랙으로 취약점 알림을 전송했습니다.');
        } else {
          console.log(`슬랙 메시지 전송 실패: ${slackResponse.status}`);
        }
      })
      .catch(err => {
        console.error('슬랙 메시지 전송 중 오류 발생:', err);
      });
  })
  .catch(err => {
    console.error('Perplexity API 응답 오류:', err);
  });
