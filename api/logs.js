const { getLogs, clearLogs, addLog } = require('../lib/logger');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const { type, limit = 100 } = req.query;
    const logs = getLogs(type, limit);
    
    addLog('api', `Retrieved ${logs.length} logs (type: ${type || 'all'})`, null, {
      method: req.method,
      path: req.url,
      query: req.query
    }, { count: logs.length });
    
    res.json(logs);
  } 
  else if (req.method === 'DELETE') {
    clearLogs();
    res.json({ message: 'Logs cleared successfully' });
  }
  else {
    res.status(405).json({ 
      error: 'Method not allowed',
      allowed: ['GET', 'DELETE']
    });
  }
};