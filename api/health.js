const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

const config = require('../config');
const googleCalendar = require('../googleCalendar');
const smsService = require('../smsService');
const { addLog } = require('../lib/logger');

dayjs.extend(utc);
dayjs.extend(timezone);

module.exports = async (req, res) => {
  // Initialize services for health check
  if (!googleCalendar.initialized) {
    try {
      await googleCalendar.initialize();
    } catch (error) {
      addLog('warning', 'Health check - Google Calendar init failed', error.message);
    }
  }
  
  if (!smsService.initialized && smsService.getStatus().enabled) {
    try {
      await smsService.initialize();
    } catch (error) {
      addLog('warning', 'Health check - SMS service init failed', error.message);
    }
  }
  
  const healthData = {
    status: 'OK',
    message: 'Rehacentrum API je v prevádzke',
    timestamp: dayjs().tz(config.calendar.timeZone).format(),
    services: {
      calendar: googleCalendar.initialized,
      sms: smsService.getStatus()
    }
  };
  
  addLog('api', `Health check - ${healthData.status}`, null, {
    method: req.method,
    path: req.url
  }, healthData);
  
  res.json(healthData);
};