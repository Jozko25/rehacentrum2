// Simple webhook log storage using global variable (will reset on cold starts but better than nothing)
global.webhookLogs = global.webhookLogs || [];

const MAX_LOGS = 50;

function addWebhookLog(logData) {
  const log = {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    ...logData
  };
  
  global.webhookLogs.unshift(log);
  if (global.webhookLogs.length > MAX_LOGS) {
    global.webhookLogs.pop();
  }
  
  return log;
}

function getWebhookLogs() {
  return global.webhookLogs || [];
}

function clearWebhookLogs() {
  global.webhookLogs = [];
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    res.json({
      logs: getWebhookLogs(),
      count: getWebhookLogs().length
    });
  } 
  else if (req.method === 'POST') {
    // Add log from webhook
    const logData = req.body;
    const log = addWebhookLog(logData);
    res.json({ success: true, log });
  }
  else if (req.method === 'DELETE') {
    clearWebhookLogs();
    res.json({ message: 'Webhook logs cleared' });
  }
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};