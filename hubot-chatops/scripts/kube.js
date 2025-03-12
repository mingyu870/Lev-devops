const { exec } = require('child_process');

module.exports = (app) => {
  // Listen for the "kubectl" keyword in messages
  app.message(/kubectl/i, async ({ message, say }) => {
    await say({
      text: 'What Kubernetes resource would you like to check?',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Choose one of the following options:',
          },
        },
        {
          type: 'actions',
          elements: [
            { type: 'button', text: { type: 'plain_text', text: 'Cluster Info' }, value: 'cluster_info', action_id: 'get_cluster_info' },
            { type: 'button', text: { type: 'plain_text', text: 'Deployments' }, value: 'deployments', action_id: 'get_deployments' },
            { type: 'button', text: { type: 'plain_text', text: 'Events' }, value: 'events', action_id: 'get_events' },
            { type: 'button', text: { type: 'plain_text', text: 'Pods' }, value: 'pods', action_id: 'get_pods' },
            { type: 'button', text: { type: 'plain_text', text: 'Top Pods' }, value: 'top_pods', action_id: 'get_top_pods' },
            { type: 'button', text: { type: 'plain_text', text: 'Wide Pods' }, value: 'wide_pods', action_id: 'get_wide_pods' },
            { type: 'button', text: { type: 'plain_text', text: 'Nodes' }, value: 'nodes', action_id: 'get_nodes' },
            { type: 'button', text: { type: 'plain_text', text: 'Top Nodes' }, value: 'top_nodes', action_id: 'get_top_nodes' },
            { type: 'button', text: { type: 'plain_text', text: 'Service Info' }, value: 'service_info', action_id: 'get_service_info' },
          ],
        },
      ],
    });
  });

  // Handle button actions
  app.action('get_cluster_info', async ({ ack, say }) => {
    await ack();
    executeKubectlCommand('kubectl cluster-info', say);
  });

  app.action('get_deployments', async ({ ack, say }) => {
    await ack();
    executeKubectlCommand('kubectl get deployments', say);
  });

  app.action('get_events', async ({ ack, say }) => {
    await ack();
    executeKubectlCommand('kubectl get events', say);
  });

  app.action('get_pods', async ({ ack, say }) => {
    await ack();
    executeKubectlCommand('kubectl get pods', say);
  });

  app.action('get_top_pods', async ({ ack, say }) => {
    await ack();
    executeKubectlCommand('kubectl top pods', say);
  });

  app.action('get_wide_pods', async ({ ack, say }) => {
    await ack();
    executeKubectlCommand('kubectl get pods -o wide', say);
  });

  app.action('get_nodes', async ({ ack, say }) => {
    await ack();
    executeKubectlCommand('kubectl get nodes', say);
  });

  app.action('get_top_nodes', async ({ ack, say }) => {
    await ack();
    executeKubectlCommand('kubectl top nodes', say);
  });

  app.action('get_service_info', async ({ ack, say }) => {
    await ack();
    executeKubectlCommand('kubectl get svc', say);
  });

  // Function to execute kubectl commands
  function executeKubectlCommand(command, say) {
    exec(command, (error, stdout, stderr) => {
      if (error) return say(`❌ Error executing command:\n\`${error.message}\``);
      if (stderr) return say(`⚠️ Command error:\n\`${stderr}\``);
      say(`✅ Command output:\n\`\`\`${stdout}\`\`\``);
    });
  }
};