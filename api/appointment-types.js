const config = require('../config');
const { addLog } = require('../lib/logger');

module.exports = async (req, res) => {
  const types = Object.entries(config.appointmentTypes).map(([key, type]) => ({
    id: key,
    name: type.name,
    schedule: type.schedule,
    duration: type.duration,
    price: type.price,
    currency: type.currency,
    insurance: type.insurance,
    requirements: type.requirements,
    dailyLimit: type.dailyLimit
  }));
  
  addLog('api', `Retrieved ${types.length} appointment types`, null, {
    method: req.method,
    path: req.url
  }, { count: types.length });
  
  res.json(types);
};