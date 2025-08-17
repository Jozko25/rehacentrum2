require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Import services
const config = require('./config/config');
const googleCalendar = require('./services/googleCalendar');
const appointmentValidator = require('./services/appointmentValidator');
const smsService = require('./services/smsService');
const holidayService = require('./services/holidayService');

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
    data: data || undefined,
    requestData: requestData || undefined,
    responseData: responseData || undefined
  };
  
  logs.unshift(log);
  if (logs.length > MAX_LOGS) {
    logs.pop();
  }
  
  // Clean console logging without undefined/null values
  const dataStr = data ? ` - Data: ${JSON.stringify(data)}` : '';
  console.log(`[${log.timestamp}] ${type.toUpperCase()}: ${message}${dataStr}`);
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

// Debug environment variables (temporary)
app.get('/debug-env', (req, res) => {
  res.json({
    TWILIO_ENABLED: process.env.TWILIO_ENABLED,
    TWILIO_ENABLED_TYPE: typeof process.env.TWILIO_ENABLED,
    HAS_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
    HAS_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
    config_sms_enabled: config.sms.enabled,
    timestamp: new Date().toISOString()
  });
});

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
    version: '1.0.3', // Admin security deployed
    services: {
      calendar: googleCalendar.initialized,
      sms: smsService.getStatus()
    }
  });
});

// Admin Security Middleware
const adminSecurity = (req, res, next) => {
  // Get client IP (handle various proxy scenarios)
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   req.headers['x-real-ip'] ||
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   (req.connection.socket ? req.connection.socket.remoteAddress : null);

  console.log(`🔍 Admin access attempt from IP: ${clientIP}`);

  // IP Whitelist (support for multiple networks)
  const allowedIPs = (process.env.ADMIN_ALLOWED_IPS || '').split(',').map(ip => ip.trim()).filter(Boolean);
  const allowedNetworks = (process.env.ADMIN_ALLOWED_NETWORKS || '').split(',').map(network => network.trim()).filter(Boolean);
  
  // Check exact IP match
  const isIPAllowed = allowedIPs.length === 0 || allowedIPs.includes(clientIP);
  
  // Check network ranges (simple CIDR-like checking)
  const isNetworkAllowed = allowedNetworks.length === 0 || allowedNetworks.some(network => {
    if (network.includes('/')) {
      // CIDR notation (basic implementation)
      const [baseIP, mask] = network.split('/');
      const maskBits = parseInt(mask);
      // Simple implementation - you could enhance this
      return clientIP.startsWith(baseIP.split('.').slice(0, Math.floor(maskBits / 8)).join('.'));
    } else {
      // Network prefix
      return clientIP.startsWith(network);
    }
  });

  if (!isIPAllowed && !isNetworkAllowed && allowedIPs.length > 0) {
    console.log(`❌ IP ${clientIP} not in whitelist: ${allowedIPs.join(', ')}`);
    return res.status(403).json({ 
      error: 'Access denied', 
      message: 'Your IP address is not authorized to access this admin panel',
      clientIP: clientIP
    });
  }

  // HTTP Basic Authentication
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Rehacentrum Admin Panel"');
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please provide admin credentials'
    });
  }

  try {
    const credentials = Buffer.from(auth.slice(6), 'base64').toString();
    const [username, password] = credentials.split(':');

    // Get admin credentials from environment
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      console.error('❌ Admin credentials not configured in environment');
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'Admin authentication not properly configured'
      });
    }

    if (username === adminUsername && password === adminPassword) {
      console.log(`✅ Admin authentication successful for user: ${username} from IP: ${clientIP}`);
      addLog('admin', `Admin panel accessed by ${username} from ${clientIP}`);
      next();
    } else {
      console.log(`❌ Invalid admin credentials for user: ${username} from IP: ${clientIP}`);
      addLog('warning', `Failed admin login attempt: ${username} from ${clientIP}`);
      res.set('WWW-Authenticate', 'Basic realm="Rehacentrum Admin Panel"');
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Username or password is incorrect'
      });
    }
  } catch (error) {
    console.error('❌ Auth parsing error:', error);
    return res.status(400).json({ 
      error: 'Invalid authentication format'
    });
  }
};

// Root endpoint - simple status (no sensitive info)
app.get('/', (req, res) => {
  res.json({
    service: 'Rehacentrum API',
    status: 'Online',
    message: 'Healthcare appointment booking system is operational',
    version: '1.0.2',
    timestamp: dayjs().tz(config.calendar.timeZone).format(),
    admin: '/admin',
    docs: 'https://docs.rehacentrum.sk'
  });
});

// Protected Admin Dashboard
app.get('/admin', adminSecurity, async (req, res) => {
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
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            /* Enterprise-Grade CSS Reset and Base Styles */
            * { box-sizing: border-box; }
            body { 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
                margin: 0; 
                padding: 0; 
                background: #f8fafc; 
                color: #1e293b;
                line-height: 1.6;
                font-weight: 400;
            }
            
            /* Container and Layout */
            .container { 
                max-width: 1600px; 
                margin: 0 auto; 
                padding: 32px; 
            }
            
            /* Header Section - Enterprise Style */
            .header { 
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                color: white; 
                padding: 40px 32px; 
                margin: -32px -32px 40px -32px;
                border-bottom: 1px solid #334155;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            }
            
            .header h1 { 
                margin: 0 0 12px 0; 
                font-size: 32px; 
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 16px;
                letter-spacing: -0.025em;
            }
            
            .header p { 
                margin: 0; 
                opacity: 0.8; 
                font-size: 15px;
                font-weight: 400;
                color: #cbd5e1;
            }
            
            /* Status Cards - Professional Design */
            .basic-info { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 24px; 
                margin-bottom: 40px; 
            }
            
            .basic-info-item { 
                background: white; 
                padding: 28px; 
                border-radius: 8px; 
                box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                border: 1px solid #e2e8f0;
                transition: all 0.15s ease;
                position: relative;
                overflow: hidden;
            }
            
            .basic-info-item::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            }
            
            .basic-info-item:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                border-color: #cbd5e1;
            }
            
            .basic-info-item strong { 
                display: block; 
                margin-bottom: 12px; 
                font-size: 13px;
                font-weight: 600;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            
            .basic-info-item span {
                font-size: 18px;
                font-weight: 600;
                color: #0f172a;
            }
            
            /* Control Buttons - Enterprise Style */
            .controls { 
                margin-bottom: 32px; 
                display: flex;
                gap: 16px;
                flex-wrap: wrap;
                align-items: center;
            }
            
            button { 
                padding: 12px 24px; 
                border: 1px solid transparent;
                border-radius: 6px; 
                cursor: pointer; 
                font-weight: 500;
                font-size: 14px;
                transition: all 0.15s ease;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                min-height: 44px;
            }
            
            button:hover {
                transform: translateY(-1px);
            }
            
            .btn-primary { 
                background: #3b82f6; 
                color: white; 
                border-color: #3b82f6;
            }
            
            .btn-primary:hover { 
                background: #2563eb;
                border-color: #2563eb;
                box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
            }
            
            .btn-danger { 
                background: #dc2626; 
                color: white; 
                border-color: #dc2626;
            }
            
            .btn-danger:hover { 
                background: #b91c1c;
                border-color: #b91c1c;
                box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.3);
            }
            
            /* Log Containers - Professional Layout */
            .log-containers { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 32px; 
                height: calc(100vh - 320px); 
            }
            
            .log-container { 
                background: white; 
                border-radius: 8px; 
                padding: 24px; 
                box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                border: 1px solid #e2e8f0;
                height: 100%; 
                overflow-y: auto; 
            }
            
            .log-container h4 { 
                margin: 0 0 24px 0; 
                color: #0f172a; 
                font-size: 18px; 
                font-weight: 600;
                border-bottom: 1px solid #e2e8f0; 
                padding-bottom: 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            /* Log Entries - Enterprise Style */
            .log-entry { 
                padding: 16px 20px; 
                margin-bottom: 12px; 
                border-radius: 6px; 
                font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace; 
                font-size: 13px; 
                cursor: pointer; 
                transition: all 0.15s ease; 
                border: 1px solid transparent; 
                position: relative;
                background: #f8fafc;
            }
            
            .log-entry:hover { 
                border-color: #cbd5e1; 
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                background: white;
            }
            
            .log-booking { border-left: 4px solid #10b981; }
            .log-api { border-left: 4px solid #3b82f6; }
            .log-webhook { border-left: 4px solid #f59e0b; }
            .log-error { border-left: 4px solid #ef4444; }
            .log-warning { border-left: 4px solid #f59e0b; }
            .log-success { border-left: 4px solid #10b981; }
            
            /* Log Details - Professional */
            .log-details { 
                display: none; 
                margin-top: 16px; 
                padding: 20px; 
                background: #f8fafc; 
                border-radius: 6px; 
                border: 1px solid #e2e8f0; 
            }
            
            .log-details pre { 
                margin: 0; 
                font-size: 12px; 
                overflow-x: auto; 
                max-height: 200px;
                background: #0f172a;
                color: #e2e8f0;
                padding: 16px;
                border-radius: 6px;
                border: 1px solid #334155;
                font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
            }
            
            .log-header { 
                display: flex; 
                justify-content: space-between; 
                align-items: flex-start; 
            }
            
            .log-expand { 
                font-weight: 600; 
                color: #3b82f6; 
                font-size: 16px;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                transition: all 0.15s ease;
                background: #eff6ff;
                border: 1px solid #dbeafe;
            }
            
            .log-expand:hover {
                background: #dbeafe;
                border-color: #3b82f6;
            }
            
            /* Tabs - Enterprise Style */
            .log-tabs { 
                display: flex; 
                gap: 0; 
                margin-bottom: 16px; 
                border-bottom: 1px solid #e2e8f0;
            }
            
            .log-tab { 
                padding: 12px 20px; 
                background: transparent; 
                cursor: pointer; 
                border-radius: 0; 
                font-size: 13px; 
                font-weight: 500;
                transition: all 0.15s ease;
                border: none;
                border-bottom: 2px solid transparent;
                color: #64748b;
            }
            
            .log-tab:hover {
                color: #3b82f6;
                background: #f8fafc;
            }
            
            .log-tab.active { 
                color: #3b82f6; 
                border-bottom-color: #3b82f6;
                background: #f8fafc;
            }
            
            .log-time { 
                font-size: 12px; 
                color: #64748b; 
                font-weight: 500;
                margin-bottom: 6px;
                font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
            }
            
            .log-path { 
                font-weight: 600; 
                color: #0f172a; 
                font-size: 14px;
                line-height: 1.4;
            }
            
            /* Status Indicators */
            .status-indicator {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-size: 14px;
                font-weight: 500;
            }
            
            .status-indicator::before {
                content: '';
                width: 8px;
                height: 8px;
                border-radius: 50%;
                display: inline-block;
            }
            
            .status-success::before { background: #10b981; }
            .status-error::before { background: #ef4444; }
            .status-warning::before { background: #f59e0b; }
            .status-info::before { background: #3b82f6; }
            
            /* Responsive Design */
            @media (max-width: 1200px) {
                .log-containers {
                    grid-template-columns: 1fr;
                    height: auto;
                }
            }
            
            @media (max-width: 768px) {
                .container {
                    padding: 20px;
                }
                
                .header {
                    padding: 32px 20px;
                    margin: -20px -20px 32px -20px;
                }
                
                .basic-info {
                    grid-template-columns: 1fr;
                }
                
                .controls {
                    flex-direction: column;
                }
                
                button {
                    width: 100%;
                    justify-content: center;
                }
            }
            
            /* Scrollbar Styling - Professional */
            .log-container::-webkit-scrollbar {
                width: 8px;
            }
            
            .log-container::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 4px;
            }
            
            .log-container::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
                border: 1px solid #f1f5f9;
            }
            
            .log-container::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 16px;">
                        <path d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3 19 3ZM19 19H5V5H19V19Z" fill="currentColor"/>
                        <path d="M7 7H17V9H7V7ZM7 11H17V13H7V11ZM7 15H14V17H7V15Z" fill="currentColor"/>
                    </svg>
                    Rehacentrum API Dashboard
                </h1>
                <p>Enterprise monitoring & system health dashboard | Last updated: <span id="lastUpdate" style="font-weight: 600; color: #fbbf24;">${dayjs().tz(config.calendar.timeZone).format('YYYY-MM-DD HH:mm:ss')}</span></p>
            </div>

            <div class="basic-info">
                <div class="basic-info-item">
                    <strong>Calendar Status</strong>
                    <span class="status-indicator ${googleCalendar.initialized ? 'status-success' : 'status-error'}">
                        ${googleCalendar.initialized ? 'Connected & Ready' : 'Disconnected'}
                    </span>
                </div>
                
                <div class="basic-info-item">
                    <strong>SMS Service</strong>
                    <span class="status-indicator ${smsService.getStatus().enabled ? 'status-success' : 'status-warning'}">
                        ${smsService.getStatus().enabled ? 'Enabled & Active' : 'Disabled'}
                    </span>
                </div>
                
                <div class="basic-info-item">
                    <strong>Activity Logs</strong>
                    <span class="status-indicator status-info">${logs.length} entries</span>
                </div>
                
                <div class="basic-info-item">
                    <strong>Server Time</strong>
                    <span style="color: #64748b; font-size: 18px; font-weight: 600;">${dayjs().tz(config.calendar.timeZone).format('HH:mm:ss')}</span>
                </div>
            </div>

            <div class="controls">
                <button class="btn-primary" onclick="refreshLogs()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4.01 7.58 4.01 12C4.01 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z" fill="currentColor"/>
                    </svg>
                    Refresh Dashboard
                </button>
                <button class="btn-danger" onclick="clearLogs()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM8 9H16V19H8V9ZM15.5 4L14.5 3H9.5L8.5 4H5V6H19V4H15.5Z" fill="currentColor"/>
                    </svg>
                    Clear All Logs
                </button>
            </div>

            <div class="log-containers">
                <!-- API & Webhook Container -->
                <div class="log-container">
                    <h4>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;">
                            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9ZM19 21H5V3H13V9H19V21Z" fill="currentColor"/>
                        </svg>
                        API Endpoints & Webhooks
                        <span style="margin-left: auto; font-size: 12px; color: #64748b; font-weight: 400;">
                            ${logs.filter(log => log.type === 'api' || log.type === 'webhook').length} entries
                        </span>
                    </h4>
                    ${logs.filter(log => log.type === 'api' || log.type === 'webhook').slice(0, 20).map(log => `
                        <div class="log-entry log-${log.type}" onclick="toggleLogDetails('${log.id}', event)">
                            <div class="log-header">
                                <div style="flex: 1;">
                                    <div class="log-time">${log.timestamp.split(' ')[1]}</div>
                                    <div class="log-path">
                                        ${log.type === 'webhook' ? 'Webhook: ' + (log.requestData?.body?.action || 'webhook') : 
                                          log.requestData?.method + ' ' + log.requestData?.path}
                                    </div>
                                    ${log.responseData?.statusCode ? 
                                        '<div style="font-size: 11px; color: #6b7280; margin-top: 4px;">' +
                                        'Status: <span style="color: ' + (log.responseData.statusCode < 400 ? '#22c55e' : '#ef4444') + '; font-weight: 600;">' +
                                        log.responseData.statusCode +
                                        '</span> (' + (log.responseData.duration || 'N/A') + ')</div>' : ''
                                    }
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
                    ${logs.filter(log => log.type === 'api' || log.type === 'webhook').length === 0 ? 
                        '<div style="color: #64748b; font-style: italic; font-size: 13px; text-align: center; padding: 40px 20px; background: #f8fafc; border-radius: 8px; border: 2px dashed #cbd5e1;"><div style="font-size: 14px; margin-bottom: 8px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">No Data Available</div>No API calls or webhooks recorded yet</div>' : ''
                    }
                </div>

                <!-- System & Bookings Container -->
                <div class="log-container">
                    <h4>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;">
                            <path d="M19 3H5C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3 19 3ZM19 19H5V5H19V19ZM7 7H17V9H7V7ZM7 11H17V13H7V11ZM7 15H14V17H7V15Z" fill="currentColor"/>
                        </svg>
                        Bookings & System Events
                        <span style="margin-left: auto; font-size: 12px; color: #64748b; font-weight: 400;">
                            ${logs.filter(log => log.type === 'booking' || ['success', 'warning', 'error'].includes(log.type)).length} entries
                        </span>
                    </h4>
                    ${logs.filter(log => log.type === 'booking' || ['success', 'warning', 'error'].includes(log.type)).slice(0, 20).map(log => `
                        <div class="log-entry log-${log.type}">
                            <div class="log-time">${log.timestamp.split(' ')[1]}</div>
                            <div class="log-path">
                                ${log.type === 'booking' ? 'Booking: ' + log.message : 
                                  log.type === 'success' ? 'Success: ' + log.message :
                                  log.type === 'error' ? 'Error: ' + log.message :
                                  log.type === 'warning' ? 'Warning: ' + log.message :
                                  log.type.toUpperCase() + ': ' + log.message}
                            </div>
                            ${log.data && log.data !== 'undefined' && log.data !== 'null' ? 
                                `<div style="font-size: 11px; color: #6b7280; margin-top: 6px; background: #f3f4f6; padding: 6px 8px; border-radius: 4px; border: 1px solid #e5e7eb;">
                                    ${typeof log.data === 'string' ? log.data : JSON.stringify(log.data)}
                                </div>` : ''
                            }
                        </div>
                    `).join('')}
                    ${logs.filter(log => log.type === 'booking' || ['success', 'warning', 'error'].includes(log.type)).length === 0 ? 
                        '<div style="color: #64748b; font-style: italic; font-size: 13px; text-align: center; padding: 40px 20px; background: #f8fafc; border-radius: 8px; border: 2px dashed #cbd5e1;"><div style="font-size: 14px; margin-bottom: 8px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">No Data Available</div>No bookings or system events recorded yet</div>' : ''
                    }
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

// IP Detection endpoint (for easy whitelist setup)
app.get('/my-ip', (req, res) => {
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   req.headers['x-real-ip'] ||
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   (req.connection.socket ? req.connection.socket.remoteAddress : null);
  
  res.json({
    ip: clientIP,
    message: 'Your current IP address',
    userAgent: req.headers['user-agent'],
    timestamp: dayjs().tz(config.calendar.timeZone).format()
  });
});

// Protected Log management endpoints
app.get('/api/logs', adminSecurity, (req, res) => {
  const { type, limit = 100 } = req.query;
  let filteredLogs = logs;
  
  if (type && type !== 'all') {
    filteredLogs = logs.filter(log => log.type === type);
  }
  
  res.json(filteredLogs.slice(0, parseInt(limit)));
});

app.delete('/api/logs', adminSecurity, (req, res) => {
  logs.length = 0;
  addLog('success', 'Logs cleared');
  res.json({ message: 'Logs cleared successfully' });
});

// Delete all events for a specific date (admin only)
app.delete('/api/events/:date', adminSecurity, async (req, res) => {
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
        dateShort: dayjs(dateTime).format('D.M.YYYY'),
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

// SMS template preview endpoint
app.post('/api/sms/preview', async (req, res) => {
  try {
    const { appointmentType, patientName, dateTime, orderNumber } = req.body;
    
    const mockSmsData = {
      appointmentType,
      patientName: patientName || 'Jan Harmady',
      dateShort: dayjs(dateTime || '2025-08-18T15:30:00+02:00').format('D.M.YYYY'),
      time: dayjs(dateTime || '2025-08-18T15:30:00+02:00').format('HH:mm'),
      orderNumber: orderNumber || '42'
    };
    
    const formattedMessage = smsService.formatAppointmentMessage(mockSmsData);
    const validation = smsService.validateMessage(formattedMessage);
    
    res.json({
      appointmentType,
      formattedMessage,
      smsData: mockSmsData,
      validation
    });
  } catch (error) {
    addLog('error', 'SMS preview failed', error.message);
    res.status(500).json({ error: error.message });
  }
});

// SMS templates management endpoint
app.get('/api/sms/templates', (req, res) => {
  try {
    const { smsConfig } = require('./config/sms-config');
    
    // Get all templates with sample previews
    const templates = {};
    Object.keys(smsConfig.templates).forEach(type => {
      const mockData = {
        appointmentType: type,
        patientName: 'Jan Harmady',
        dateShort: '18.8.2025',
        time: '15:30',
        orderNumber: '42'
      };
      
      const formattedMessage = smsService.formatAppointmentMessage(mockData);
      const validation = smsService.validateMessage(formattedMessage);
      
      templates[type] = {
        ...smsConfig.templates[type],
        preview: formattedMessage,
        validation
      };
    });
    
    res.json({
      templates,
      settings: smsConfig.settings,
      notifications: smsConfig.notifications
    });
  } catch (error) {
    addLog('error', 'Failed to get SMS templates', error.message);
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