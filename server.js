const express = require('express');
const cors = require('cors');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Import services
const config = require('./config');
const googleCalendar = require('./googleCalendar');
const appointmentValidator = require('./appointmentValidator');
const smsService = require('./smsService');
const holidayService = require('./holidayService');

// Configure dayjs
dayjs.extend(utc);
dayjs.extend(timezone);

const app = express();
const PORT = config.port;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Enhanced logging system
const logs = [];
const MAX_LOGS = 1000;

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
}

// Enhanced request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Skip logging for root path to reduce clutter
  if (req.path === '/') {
    return next();
  }
  
  // Capture request data
  const requestData = {
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']
    }
  };
  
  // Store original res.json to capture response
  const originalJson = res.json;
  let responseData = null;
  
  res.json = function(data) {
    responseData = data;
    return originalJson.call(this, data);
  };
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logType = req.path.includes('/api/booking/webhook') ? 'webhook' : 'api';
    const message = `${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`;
    
    addLog(logType, message, null, requestData, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      data: responseData
    });
  });
  
  next();
});

// Initialize services
async function initializeServices() {
  try {
    await googleCalendar.initialize();
    await smsService.initialize();
    addLog('success', 'All services initialized successfully');
  } catch (error) {
    addLog('error', 'Failed to initialize services', error.message);
  }
}

// Health check endpoint
app.get('/health', async (req, res) => {
  // Ensure services are initialized for health check
  if (!googleCalendar.initialized) {
    try {
      await googleCalendar.initialize();
    } catch (error) {
      console.log('Health check - Google Calendar init failed:', error.message);
    }
  }
  
  if (!smsService.initialized && smsService.getStatus().enabled) {
    try {
      await smsService.initialize();
    } catch (error) {
      console.log('Health check - SMS service init failed:', error.message);
    }
  }
  
  res.json({
    status: 'OK',
    message: 'Rehacentrum API je v prevádzke',
    timestamp: dayjs().tz(config.calendar.timeZone).format(),
    services: {
      calendar: googleCalendar.initialized,
      sms: smsService.getStatus()
    }
  });
});

// Dashboard endpoint
app.get('/', async (req, res) => {
  // Ensure services are initialized for dashboard
  if (!googleCalendar.initialized) {
    try {
      await googleCalendar.initialize();
    } catch (error) {
      console.log('Dashboard - Google Calendar init failed:', error.message);
    }
  }
  const html = `
    <!DOCTYPE html>
    <html lang="sk">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rehacentrum API Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 100%; margin: 0; padding: 20px; }
            .header { background: #2c3e50; color: white; padding: 20px; margin-bottom: 20px; }
            .basic-info { display: flex; gap: 20px; margin-bottom: 20px; align-items: center; }
            .basic-info-item { background: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .basic-info-item strong { display: block; margin-bottom: 5px; }
            .log-containers { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; height: calc(100vh - 200px); }
            .log-container { background: white; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); height: 100%; overflow-y: auto; }
            .log-container h4 { margin: 0 0 10px 0; color: #333; font-size: 14px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .log-entry { padding: 8px 10px; margin-bottom: 5px; border-radius: 4px; font-family: monospace; font-size: 11px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
            .log-entry:hover { border-color: #007bff; transform: translateY(-1px); }
            .log-booking { background: #e8f5e8; border-left: 3px solid #28a745; }
            .log-api { background: #f0f8ff; border-left: 3px solid #007bff; }
            .log-webhook { background: #fff5e6; border-left: 3px solid #fd7e14; }
            .log-error { background: #ffe6e6; border-left: 3px solid #dc3545; }
            .log-warning { background: #fff3cd; border-left: 3px solid #ffc107; }
            .log-success { background: #d4edda; border-left: 3px solid #28a745; }
            .log-details { display: none; margin-top: 8px; padding: 8px; background: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6; }
            .log-details pre { margin: 0; font-size: 10px; overflow-x: auto; max-height: 200px; }
            .log-header { display: flex; justify-content: space-between; align-items: center; }
            .log-expand { font-weight: bold; color: #007bff; }
            .log-tabs { display: flex; gap: 5px; margin-bottom: 8px; }
            .log-tab { padding: 3px 8px; background: #e9ecef; cursor: pointer; border-radius: 3px; font-size: 9px; }
            .log-tab.active { background: #007bff; color: white; }
            .log-time { font-size: 10px; color: #6c757d; }
            .log-path { font-weight: bold; color: #495057; }
            .controls { margin-bottom: 20px; }
            button { padding: 10px 20px; margin-right: 10px; border: none; border-radius: 4px; cursor: pointer; }
            .btn-primary { background: #007bff; color: white; }
            .btn-danger { background: #dc3545; color: white; }
            .filter { margin-bottom: 10px; }
            select { padding: 8px; border-radius: 4px; border: 1px solid #ddd; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏥 Rehacentrum API Dashboard</h1>
                <p>Real-time monitoring | Last updated: <span id="lastUpdate">${dayjs().tz(config.calendar.timeZone).format('YYYY-MM-DD HH:mm:ss')}</span></p>
            </div>

            <div class="basic-info">
                <div class="basic-info-item">
                    <strong>Calendar</strong>
                    <span style="color: ${googleCalendar.initialized ? 'green' : 'red'}">${googleCalendar.initialized ? '✓ Connected' : '✗ Disconnected'}</span>
                </div>
                
                <div class="basic-info-item">
                    <strong>SMS Service</strong>
                    <span style="color: ${smsService.getStatus().enabled ? 'green' : 'orange'}">${smsService.getStatus().enabled ? '✓ Enabled' : '⚠ Disabled'}</span>
                </div>
                
                <div class="basic-info-item">
                    <strong>Activity Logs</strong>
                    <span>${logs.length} entries</span>
                </div>
            </div>

            <div class="controls">
                <button class="btn-primary" onclick="refreshLogs()">🔄 Refresh</button>
                <button class="btn-danger" onclick="clearLogs()">🗑️ Clear Logs</button>
            </div>

            <div class="log-containers">
                <!-- API & Webhook Container -->
                <div class="log-container">
                    <h4>🔌 API Endpoints & Webhooks</h4>
                    ${logs.filter(log => log.type === 'api' || log.type === 'webhook').slice(0, 20).map(log => `
                        <div class="log-entry log-${log.type}" onclick="toggleLogDetails('${log.id}', event)">
                            <div class="log-header">
                                <div>
                                    <div class="log-time">${log.timestamp.split(' ')[1]}</div>
                                    <div class="log-path">${log.type === 'webhook' ? '🤖 ' + (log.requestData?.body?.action || 'webhook') : log.requestData?.method + ' ' + log.requestData?.path}</div>
                                </div>
                                <span class="log-expand">+</span>
                            </div>
                            <div id="details-${log.id}" class="log-details">
                                <div class="log-tabs">
                                    <div class="log-tab active" onclick="showTab('${log.id}', 'request', event)">Request</div>
                                    <div class="log-tab" onclick="showTab('${log.id}', 'response', event)">Response</div>
                                </div>
                                <div id="tab-${log.id}-request" class="tab-content">
                                    <pre>${JSON.stringify(log.requestData, null, 2)}</pre>
                                </div>
                                <div id="tab-${log.id}-response" class="tab-content" style="display: none;">
                                    <pre>${JSON.stringify(log.responseData, null, 2)}</pre>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    ${logs.filter(log => log.type === 'api' || log.type === 'webhook').length === 0 ? '<div style="color: #6c757d; font-style: italic; font-size: 12px;">No API calls or webhooks yet</div>' : ''}
                </div>

                <!-- System & Bookings Container -->
                <div class="log-container">
                    <h4>📅 Bookings & System Events</h4>
                    ${logs.filter(log => log.type === 'booking' || ['success', 'warning', 'error'].includes(log.type)).slice(0, 20).map(log => `
                        <div class="log-entry log-${log.type}">
                            <div class="log-time">${log.timestamp.split(' ')[1]}</div>
                            <div class="log-path">${log.type === 'booking' ? '📅 ' + log.message : log.type.toUpperCase() + ': ' + log.message}</div>
                            ${log.data ? `<div style="font-size: 10px; color: #6c757d; margin-top: 3px;">${JSON.stringify(log.data)}</div>` : ''}
                        </div>
                    `).join('')}
                    ${logs.filter(log => log.type === 'booking' || ['success', 'warning', 'error'].includes(log.type)).length === 0 ? '<div style="color: #6c757d; font-style: italic; font-size: 12px;">No bookings or system events yet</div>' : ''}
                </div>
            </div>
        </div>

        <script>
            function refreshLogs() {
                location.reload();
            }
            
            function clearLogs() {
                if (confirm('Clear all logs?')) {
                    fetch('/api/logs', { method: 'DELETE' })
                        .then(() => location.reload());
                }
            }
            
            function toggleLogDetails(logId, event) {
                event.stopPropagation();
                const details = document.getElementById('details-' + logId);
                const expand = details.previousElementSibling.querySelector('.log-expand');
                
                if (details.style.display === 'none' || details.style.display === '') {
                    details.style.display = 'block';
                    expand.textContent = '-';
                } else {
                    details.style.display = 'none';
                    expand.textContent = '+';
                }
            }
            
            function showTab(logId, tabName, event) {
                event.stopPropagation();
                // Hide all tabs for this log
                const tabs = document.querySelectorAll('#details-' + logId + ' .tab-content');
                tabs.forEach(tab => tab.style.display = 'none');
                
                // Remove active class from all tab buttons
                const tabButtons = document.querySelectorAll('#details-' + logId + ' .log-tab');
                tabButtons.forEach(btn => btn.classList.remove('active'));
                
                // Show selected tab
                document.getElementById('tab-' + logId + '-' + tabName).style.display = 'block';
                
                // Add active class to clicked tab button
                event.target.classList.add('active');
            }
            
            
            // Auto-refresh every 15 seconds (reduced from 10 to avoid interrupting user interaction)
            setInterval(() => {
                document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
            }, 1000);
            
            setInterval(refreshLogs, 15000);
        </script>
    </body>
    </html>
  `;
  res.send(html);
});

// Log management endpoints
app.get('/api/logs', (req, res) => {
  const { type, limit = 100 } = req.query;
  let filteredLogs = logs;
  
  if (type && type !== 'all') {
    filteredLogs = logs.filter(log => log.type === type);
  }
  
  res.json(filteredLogs.slice(0, parseInt(limit)));
});

app.delete('/api/logs', (req, res) => {
  logs.length = 0;
  addLog('success', 'Logs cleared');
  res.json({ message: 'Logs cleared successfully' });
});

// Delete all events for a specific date
app.delete('/api/events/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format
    if (!dayjs(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({
        error: 'Invalid date format. Use YYYY-MM-DD format.'
      });
    }

    addLog('api', `Deleting all events for date: ${date}`);
    
    const result = await googleCalendar.deleteAllEventsForDate(date);
    
    addLog('success', `Deleted ${result.deleted} events from ${date}`);
    res.json(result);
  } catch (error) {
    addLog('error', `Failed to delete events for date: ${error.message}`);
    res.status(500).json({
      error: 'Failed to delete events',
      message: error.message
    });
  }
});

// Appointment Types endpoint
app.get('/api/appointment-types', (req, res) => {
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
  
  res.json(types);
});

// Get available slots
app.get('/api/available-slots', async (req, res) => {
  try {
    const { date, appointmentType, limit = 10 } = req.query;
    
    if (!date || !appointmentType) {
      return res.status(400).json({
        error: 'Date and appointment type are required',
        required: ['date', 'appointmentType']
      });
    }

    const typeValidation = appointmentValidator.validateAppointmentType(appointmentType);
    if (!typeValidation.isValid) {
      return res.status(400).json(typeValidation);
    }

    const availableSlots = await googleCalendar.getAvailableSlots(date, appointmentType);
    
    res.json({
      date,
      appointmentType,
      totalSlots: availableSlots.length,
      slots: availableSlots.slice(0, parseInt(limit))
    });
    
    addLog('api', `Retrieved ${availableSlots.length} available slots for ${appointmentType} on ${date}`);
  } catch (error) {
    addLog('error', 'Failed to get available slots', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get availability for entire day
app.get('/api/availability/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const availability = {};
    
    for (const [typeKey, typeConfig] of Object.entries(config.appointmentTypes)) {
      const slots = await googleCalendar.getAvailableSlots(date, typeKey);
      availability[typeKey] = {
        name: typeConfig.name,
        totalSlots: slots.length,
        availableSlots: slots.slice(0, 5) // First 5 slots
      };
    }
    
    res.json({
      date,
      availability,
      isWorkingDay: await holidayService.isWorkingDay(date)
    });
    
    addLog('api', `Retrieved full day availability for ${date}`);
  } catch (error) {
    addLog('error', 'Failed to get day availability', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Find soonest available slot
app.post('/slots/soonest', async (req, res) => {
  try {
    const { appointmentType, daysToSearch = 7 } = req.body;
    
    const typeValidation = appointmentValidator.validateAppointmentType(appointmentType);
    if (!typeValidation.isValid) {
      return res.status(400).json(typeValidation);
    }

    const today = dayjs().tz(config.calendar.timeZone);
    let foundSlot = null;
    
    for (let i = 0; i < daysToSearch; i++) {
      const checkDate = today.add(i, 'day').format('YYYY-MM-DD');
      
      if (await holidayService.isWorkingDay(checkDate)) {
        const slots = await googleCalendar.getAvailableSlots(checkDate, appointmentType);
        if (slots.length > 0) {
          foundSlot = {
            date: checkDate,
            slot: slots[0],
            daysFromNow: i
          };
          break;
        }
      }
    }
    
    if (foundSlot) {
      res.json({
        found: true,
        ...foundSlot
      });
      addLog('api', `Found soonest slot for ${appointmentType}: ${foundSlot.date} ${foundSlot.slot.time}`);
    } else {
      res.json({
        found: false,
        message: `No available slots found in the next ${daysToSearch} days`
      });
      addLog('warning', `No slots found for ${appointmentType} in next ${daysToSearch} days`);
    }
  } catch (error) {
    addLog('error', 'Failed to find soonest slot', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Create appointment
app.post('/api/appointments', async (req, res) => {
  try {
    const { patientData, appointmentType, dateTime } = req.body;
    
    // Validate complete appointment
    const validation = await appointmentValidator.validateCompleteAppointment({
      patientData,
      appointmentType,
      dateTime
    });
    
    if (!validation.isValid) {
      const alternatives = await appointmentValidator.findAlternativeSlots(
        appointmentType,
        dayjs(dateTime).format('YYYY-MM-DD')
      );
      
      return res.status(400).json({
        errors: validation.errors,
        alternatives: alternatives.slice(0, 3)
      });
    }
    
    // Get order number
    const date = dayjs(dateTime).format('YYYY-MM-DD');
    const orderNumber = await googleCalendar.getOrderNumber(appointmentType, date);
    
    // Create calendar event
    const typeConfig = config.appointmentTypes[appointmentType];
    const eventData = {
      appointmentType,
      patientName: `${patientData.name} ${patientData.surname}`,
      phone: patientData.phone,
      insurance: patientData.insurance,
      email: patientData.email,
      birthId: patientData.birthId,
      dateTime,
      duration: typeConfig.duration,
      price: typeConfig.price,
      colorId: typeConfig.color,
      orderNumber
    };
    
    const event = await googleCalendar.createEvent(eventData);
    
    // Send SMS confirmation if enabled
    let smsResult = null;
    if (smsService.getStatus().enabled) {
      const smsData = {
        ...eventData,
        dateShort: dayjs(dateTime).format('D.M.'),
        time: dayjs(dateTime).format('HH:mm')
      };
      smsResult = await smsService.sendAppointmentConfirmation(smsData);
    }
    
    const response = {
      success: true,
      appointment: {
        id: event.id,
        patientName: eventData.patientName,
        appointmentType: typeConfig.name,
        dateTime: dayjs(dateTime).tz(config.calendar.timeZone).format(),
        orderNumber,
        price: `${typeConfig.price}€`,
        requirements: typeConfig.requirements
      },
      sms: smsResult
    };
    
    addLog('booking', `Appointment created: ${eventData.patientName} - ${appointmentType} on ${date}`, {
      orderId: orderNumber,
      smsStatus: smsResult?.success
    });
    
    res.status(201).json(response);
  } catch (error) {
    addLog('error', 'Failed to create appointment', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Legacy appointment creation endpoint
app.post('/events/add', async (req, res) => {
  try {
    // Map legacy format to new format
    const { 
      appointmentType, 
      name, 
      surname, 
      phone, 
      insurance, 
      email, 
      birthId, 
      date, 
      time 
    } = req.body;
    
    const dateTime = dayjs(`${date} ${time}`, 'YYYY-MM-DD HH:mm').toISOString();
    
    const mappedRequest = {
      patientData: { name, surname, phone, insurance, email, birthId },
      appointmentType,
      dateTime
    };
    
    // Use the main appointment creation logic
    req.body = mappedRequest;
    return app._router.handle(req, res, () => {});
  } catch (error) {
    addLog('error', 'Legacy appointment creation failed', error.message);
    res.status(500).json({ error: error.message });
  }
});

// SMS test endpoint
app.post('/api/sms/test', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const result = await smsService.sendTestMessage(phone, message);
    
    addLog(result.success ? 'success' : 'warning', 
          `SMS test ${result.success ? 'sent' : 'failed'} to ${phone}`, 
          result.error);
    
    res.json(result);
  } catch (error) {
    addLog('error', 'SMS test failed', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Requirements endpoint
app.get('/api/requirements/:type', (req, res) => {
  const { type } = req.params;
  const typeConfig = config.appointmentTypes[type];
  
  if (!typeConfig) {
    return res.status(404).json({ error: 'Appointment type not found' });
  }
  
  res.json({
    appointmentType: typeConfig.name,
    requirements: typeConfig.requirements,
    price: `${typeConfig.price}€`,
    insurance: typeConfig.insurance,
    duration: `${typeConfig.duration} minutes`,
    schedule: typeConfig.schedule
  });
});

// ElevenLabs webhook endpoint (route to the webhook handler)
app.use('/api/booking/webhook', require('./api/booking/webhook'));

// Error handling middleware
app.use((error, req, res, next) => {
  addLog('error', `Unhandled error: ${error.message}`, error.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: 'Something went wrong. Please try again later.'
  });
});

// 404 handler
app.use((req, res) => {
  addLog('warning', `404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

// Start server
async function startServer() {
  await initializeServices();
  
  app.listen(PORT, () => {
    addLog('success', `Rehacentrum API server started on port ${PORT}`);
    console.log(`🏥 Rehacentrum API running at http://localhost:${PORT}`);
    console.log(`📊 Dashboard available at http://localhost:${PORT}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  addLog('warning', 'SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  addLog('warning', 'SIGINT received, shutting down gracefully');
  process.exit(0);
});

if (require.main === module) {
  startServer().catch(error => {
    addLog('error', 'Failed to start server', error.message);
    process.exit(1);
  });
}

module.exports = app;