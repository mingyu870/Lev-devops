const axios = require('axios');

module.exports = (app) => {
  const ARGOCD_URL = process.env.ARGOCD_URL; // ArgoCD URL
  const ARGOCD_TOKEN = process.env.ARGOCD_TOKEN; // ArgoCD API Token
  let allApplications = []; // 모든 애플리케이션을 저장할 변수
  let displayedApplications = []; // 표시된 애플리케이션 목록

  // Listen for the "argo" keyword in messages
  app.message(/argo/i, async ({ message, say }) => {
    try {
      // Fetch list of applications from ArgoCD
      const response = await axios.get(`${ARGOCD_URL}/api/v1/applications`, {
        headers: { Authorization: `Bearer ${ARGOCD_TOKEN}` },
      });

      allApplications = response.data.items;

      if (!allApplications || allApplications.length === 0) {
        await say('❌ No applications found in ArgoCD.');
        return;
      }

      // Display the first 5 applications
      displayedApplications = allApplications.slice(0, 5);

      // Create buttons dynamically for each application
      const buttons = displayedApplications.map((app) => ({
        type: 'button',
        text: { type: 'plain_text', text: app.metadata.name },
        value: `deploy_${app.metadata.name}`,
        action_id: `deploy_${app.metadata.name}`,
      }));

      // Add a "More" button to load additional applications
      if (allApplications.length > 5) {
        buttons.push({
          type: 'button',
          text: { type: 'plain_text', text: 'More' },
          value: 'more',
          action_id: 'load_more',
        });
      }

      await say({
        text: 'Which application would you like to deploy?',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Choose an application to deploy:*',
            },
          },
          {
            type: 'actions',
            elements: buttons,
          },
        ],
      });
    } catch (error) {
      console.error('Error fetching applications from ArgoCD:', error);
      await say('❌ Failed to fetch applications from ArgoCD.');
    }
  });

  // Handle application-specific deploy actions
  app.action(/deploy_.+/, async ({ body, ack, say }) => {
    await ack();

    const appName = body.actions[0].value.split('_')[1]; // Extract the application name from value

    try {
      // Step 1: Trigger the sync operation to deploy the application
      const response = await axios.post(
        `${ARGOCD_URL}/api/v1/applications/${appName}/sync`,
        {},
        {
          headers: { Authorization: `Bearer ${ARGOCD_TOKEN}` },
        }
      );

      console.log('Deployment response:', response.data); // 응답 데이터 확인

      // Step 2: Notify the user about the successful deployment
      await say({
        text: `✅ Deployment for *${appName}* has been triggered successfully.`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*✅ Deployment for ${appName}* is in success!! `,
            },
          },
        ],
      });
    } catch (error) {
      console.error(`Error syncing application ${appName}:`, error); // 에러 로그 출력

      // 상세 에러 메시지 제공
      await say(`❌ Failed to deploy *${appName}*. Error: ${error.message || error}`);
    }
  });

  // Handle "More" button to show additional applications
  app.action('load_more', async ({ body, ack, say }) => {
    await ack();

    // Get the next 5 applications (6th to 10th, 11th to 15th, etc.)
    const startIndex = displayedApplications.length;
    const newApplications = allApplications.slice(startIndex, startIndex + 5);
    displayedApplications = [...displayedApplications, ...newApplications];

    // Create buttons for the new applications
    const buttons = newApplications.map((app) => ({
      type: 'button',
      text: { type: 'plain_text', text: app.metadata.name },
      value: `deploy_${app.metadata.name}`,
      action_id: `deploy_${app.metadata.name}`,
    }));

    // If there are more applications to load, add the "More" button
    if (allApplications.length > displayedApplications.length) {
      buttons.push({
        type: 'button',
        text: { type: 'plain_text', text: 'More' },
        value: 'more',
        action_id: 'load_more',
      });
    }

    await say({
      text: 'Which application would you like to deploy?',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Choose an application to deploy:*',
          },
        },
        {
          type: 'actions',
          elements: buttons,
        },
      ],
    });
  });
};