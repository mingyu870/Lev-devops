const axios = require('axios');

module.exports = (app) => {
  const JENKINS_URL = process.env.JENKINS_URL; // Jenkins URL
  const JENKINS_USER = process.env.JENKINS_USER; // Jenkins 사용자 이름
  const JENKINS_API_TOKEN = process.env.JENKINS_API_TOKEN; // Jenkins API 토큰

  let allJobs = [];

  // Step 1: Display available services
  app.message(/build/i, async ({ message, say }) => {
    try {
      // Fetch jobs from Jenkins
      const response = await axios.get(`${JENKINS_URL}/api/json`, {
        auth: { username: JENKINS_USER, password: JENKINS_API_TOKEN },
      });

      allJobs = response.data.jobs;

      if (!allJobs || allJobs.length === 0) {
        await say('❌ No Jenkins jobs found.');
        return;
      }

      // Show available services
      const buttons = allJobs.map((job) => ({
        type: 'button',
        text: { type: 'plain_text', text: job.name },
        value: job.name,
        action_id: `select_service_${job.name}`,
      }));

      await say({
        text: 'Choose a service to build:',
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: '*Step 1: Choose a service to build*' },
          },
          {
            type: 'actions',
            elements: buttons,
          },
        ],
      });
    } catch (error) {
      console.error('Error fetching Jenkins jobs:', error);
      await say('❌ Failed to fetch Jenkins jobs.');
    }
  });

  // Step 2: Confirm build action
  app.action(/select_service_.+/, async ({ body, ack, say, client }) => {
    await ack(); // Acknowledge the action

    const selectedJob = body.actions[0].value;
    const fullJobName = `${selectedJob}-deploy`;

    // Delete the previous message
    await client.chat.delete({
      channel: body.channel.id,
      ts: body.message.ts,
    });

    await say({
      text: `Do you really want to build ${fullJobName}?`,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Step 2: Confirm your action*\nDo you really want to build *${fullJobName}*?` },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Yes' },
              value: selectedJob,
              action_id: `confirm_build_yes_${selectedJob}`,
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'No' },
              value: selectedJob,
              action_id: `confirm_build_no_${selectedJob}`,
            },
          ],
        },
      ],
    });
  });

  // Step 3: Handle confirmation (Yes)
  app.action(/confirm_build_yes_.+/, async ({ body, ack, say, client }) => {
    await ack(); // Acknowledge the action

    const selectedJob = body.actions[0].value;
    const fullJobName = `${selectedJob}-deploy`;

    // Delete the previous message
    await client.chat.delete({
      channel: body.channel.id,
      ts: body.message.ts,
    });

    try {
      // Get the last build number from Jenkins
      const lastBuildResponse = await axios.get(`${JENKINS_URL}/job/${selectedJob}/job/${fullJobName}/lastBuild/api/json`, {
        auth: { username: JENKINS_USER, password: JENKINS_API_TOKEN },
      });

      const lastBuildNumber = lastBuildResponse.data.number;
      const currentVersion = `0.0.${lastBuildNumber}`;  // Example: 0.0.194
      const newVersion = `0.0.${lastBuildNumber + 1}`;  // New version: 0.0.195

      // Trigger Jenkins build with version as parameter
      await axios.post(
        `${JENKINS_URL}/job/${selectedJob}/job/${fullJobName}/buildWithParameters`,
        { version: newVersion },
        {
          auth: { username: JENKINS_USER, password: JENKINS_API_TOKEN },
        }
      );

      await say(`✅ Build triggered for *${fullJobName}* with version ${newVersion}.`);
    } catch (error) {
      console.error(`Error triggering build for ${fullJobName}:`, error);
      await say(`❌ Failed to trigger build for *${fullJobName}*.`);
    }
  });

  // Step 3: Handle cancellation (No)
  app.action(/confirm_build_no_.+/, async ({ body, ack, say, client }) => {
    await ack(); // Acknowledge the action

    const selectedJob = body.actions[0].value;

    // Delete the previous message
    await client.chat.delete({
      channel: body.channel.id,
      ts: body.message.ts,
    });

    await say(`❌ Build for *${selectedJob}* has been cancelled.`);
  });
};
