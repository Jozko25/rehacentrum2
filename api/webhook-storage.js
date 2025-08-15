// Simple persistent webhook log storage using Vercel's edge functions
// This will store logs in memory per function instance

if (!global.WEBHOOK_LOGS) {
  global.WEBHOOK_LOGS = [];
}

const MAX_LOGS = 100;

function addWebhookLog(logData) {
  const log = {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    time: new Date().toLocaleTimeString(),
    ...logData
  };
  
  global.WEBHOOK_LOGS.unshift(log);
  if (global.WEBHOOK_LOGS.length > MAX_LOGS) {
    global.WEBHOOK_LOGS.pop();
  }
  
  console.log(`📝 Stored webhook log: ${logData.action} - ${logData.success ? 'SUCCESS' : 'ERROR'}`);
  return log;
}

module.exports = async (req, res) => {
  // Enable CORS for dashboard to access this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET') {
    // Return all webhook logs
    res.json({
      logs: global.WEBHOOK_LOGS || [],
      count: (global.WEBHOOK_LOGS || []).length,
      timestamp: new Date().toISOString()
    });
  } 
  else if (req.method === 'POST') {
    // Store new webhook log
    const logData = req.body;
    const log = addWebhookLog(logData);
    res.json({ success: true, log, total: global.WEBHOOK_LOGS.length });
  }
  else if (req.method === 'DELETE') {
    // Clear all logs
    global.WEBHOOK_LOGS = [];
    res.json({ message: 'Webhook logs cleared', count: 0 });
  }
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};