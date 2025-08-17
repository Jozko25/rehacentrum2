const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const config = require('../config/config');

dayjs.extend(utc);
dayjs.extend(timezone);

// In-memory logs for serverless (will reset on cold starts, but better than nothing)
let logs = [];
const MAX_LOGS = 100; // Reduced for serverless

function addLog(type, message, data = null, requestData = null, responseData = null) {
  const log = {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    timestamp: dayjs().tz(config.calendar.timeZone).format('YYYY-MM-DD HH:mm:ss'),
    type,
    message,
    data,
    requestData,
    responseData
  };
  
  logs.unshift(log);
  if (logs.length > MAX_LOGS) {
    logs.pop();
  }
  
  console.log(`[${log.timestamp}] ${type.toUpperCase()}: ${message}`);
  return log;
}

function getLogs(type = null, limit = 50) {
  let filteredLogs = logs;
  
  if (type && type !== 'all') {
    filteredLogs = logs.filter(log => log.type === type);
  }
  
  return filteredLogs.slice(0, parseInt(limit));
}

function clearLogs() {
  logs.length = 0;
  addLog('success', 'Logs cleared');
}

function getLogStats() {
  return {
    total: logs.length,
    byType: {
      webhook: logs.filter(l => l.type === 'webhook').length,
      api: logs.filter(l => l.type === 'api').length,
      booking: logs.filter(l => l.type === 'booking').length,
      success: logs.filter(l => l.type === 'success').length,
      warning: logs.filter(l => l.type === 'warning').length,
      error: logs.filter(l => l.type === 'error').length
    }
  };
}

module.exports = {
  addLog,
  getLogs,
  clearLogs,
  getLogStats
};