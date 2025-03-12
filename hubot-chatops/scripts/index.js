require('dotenv').config();
const { App } = require('@slack/bolt');

// Initialize the Slack app
const app = new App({
  token: process.env.HUBOT_SLACK_TOKEN,
  signingSecret: process.env.HUBOT_SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Import and initialize feature modules
require('./kube')(app);
require('./jenkins')(app);
require('./argocd')(app); 

// Start the app
(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();