const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Import services
const config = require('../config/config');
const googleCalendar = require('../services/googleCalendar');
const smsService = require('../services/smsService');
const { addLog, getLogs } = require('../lib/logger');

dayjs.extend(utc);
dayjs.extend(timezone);

// Initialize services
let servicesInitialized = false;
async function initializeServices() {
  if (servicesInitialized) return;
  
  try {
    await googleCalendar.initialize();
    await smsService.initialize();
    servicesInitialized = true;
    addLog('success', 'Dashboard services initialized');
  } catch (error) {
    addLog('error', 'Failed to initialize dashboard services', error.message);
  }
}

module.exports = async (req, res) => {
  // Initialize services
  await initializeServices();
  
  const logs = getLogs();
  
  const html = `
    <!DOCTYPE html>
    <html lang="sk">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rehacentrum API Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
            .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .log-containers { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 15px; margin-bottom: 20px; }
            .log-container { background: white; border-radius: 8px; padding: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-height: 400px; overflow-y: auto; }
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
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏥 Rehacentrum API Dashboard</h1>
                <p>Real-time monitoring | Last updated: <span id="lastUpdate">${dayjs().tz(config.calendar.timeZone).format('YYYY-MM-DD HH:mm:ss')}</span></p>
            </div>

            <div class="stats">
                <div class="stat-card">
                    <h3>📊 System Status</h3>
                    <p>Calendar: <span style="color: ${googleCalendar.initialized ? 'green' : 'red'}">${googleCalendar.initialized ? '✓ Connected' : '✗ Disconnected'}</span></p>
                    <p>SMS: <span style="color: ${smsService.getStatus().enabled ? 'green' : 'orange'}">${smsService.getStatus().enabled ? '✓ Enabled' : '⚠ Disabled'}</span></p>
                </div>
                
                <div class="stat-card">
                    <h3>📱 SMS Service</h3>
                    <p>Status: ${smsService.getStatus().enabled ? 'Active' : 'Disabled'}</p>
                    <p>Phone: ${smsService.getStatus().phoneNumber || 'N/A'}</p>
                </div>
                
                <div class="stat-card">
                    <h3>📅 Appointment Types</h3>
                    <p>Total: ${Object.keys(config.appointmentTypes).length}</p>
                    <p>Active: ${Object.keys(config.appointmentTypes).length}</p>
                </div>
                
                <div class="stat-card">
                    <h3>📝 Activity Logs</h3>
                    <p>Total entries: ${logs.length}</p>
                    <p>Max capacity: 100</p>
                </div>
            </div>

            <div class="controls">
                <button class="btn-primary" onclick="refreshLogs()">🔄 Refresh</button>
                <button class="btn-danger" onclick="clearLogs()">🗑️ Clear Logs</button>
            </div>

            <div class="log-containers">
                <!-- Webhook Container -->
                <div class="log-container">
                    <h4>🤖 ElevenLabs Webhooks <span id="webhook-count">(0)</span></h4>
                    <div id="webhook-logs-container">
                        <div style="color: #6c757d; font-style: italic; font-size: 12px;">Loading webhook logs...</div>
                    </div>
                </div>

                <!-- API Container -->
                <div class="log-container">
                    <h4>🔌 API Endpoints</h4>
                    ${logs.filter(log => log.type === 'api').slice(0, 10).map(log => `
                        <div class="log-entry log-${log.type}" onclick="toggleLogDetails('${log.id}')">
                            <div class="log-header">
                                <div>
                                    <div class="log-time">${log.timestamp.split(' ')[1]}</div>
                                    <div class="log-path">${log.requestData?.method} ${log.requestData?.path}</div>
                                </div>
                                <span class="log-expand">+</span>
                            </div>
                            <div id="details-${log.id}" class="log-details">
                                <div class="log-tabs">
                                    <div class="log-tab active" onclick="showTab('${log.id}', 'request')">Request</div>
                                    <div class="log-tab" onclick="showTab('${log.id}', 'response')">Response</div>
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
                    ${logs.filter(log => log.type === 'api').length === 0 ? '<div style="color: #6c757d; font-style: italic; font-size: 12px;">No API calls yet</div>' : ''}
                </div>

                <!-- Bookings Container -->
                <div class="log-container">
                    <h4>📅 Bookings</h4>
                    ${logs.filter(log => log.type === 'booking').slice(0, 10).map(log => `
                        <div class="log-entry log-${log.type}">
                            <div class="log-time">${log.timestamp.split(' ')[1]}</div>
                            <div class="log-path">${log.message}</div>
                            ${log.data ? `<div style="font-size: 10px; color: #6c757d; margin-top: 3px;">${JSON.stringify(log.data)}</div>` : ''}
                        </div>
                    `).join('')}
                    ${logs.filter(log => log.type === 'booking').length === 0 ? '<div style="color: #6c757d; font-style: italic; font-size: 12px;">No bookings yet</div>' : ''}
                </div>

                <!-- System Container -->
                <div class="log-container">
                    <h4>⚙️ System</h4>
                    ${logs.filter(log => ['success', 'warning', 'error'].includes(log.type)).slice(0, 10).map(log => `
                        <div class="log-entry log-${log.type}">
                            <div class="log-time">${log.timestamp.split(' ')[1]}</div>
                            <div class="log-path">${log.type.toUpperCase()}: ${log.message}</div>
                            ${log.data ? `<div style="font-size: 10px; color: #6c757d; margin-top: 3px;">${JSON.stringify(log.data)}</div>` : ''}
                        </div>
                    `).join('')}
                    ${logs.filter(log => ['success', 'warning', 'error'].includes(log.type)).length === 0 ? '<div style="color: #6c757d; font-style: italic; font-size: 12px;">No system events yet</div>' : ''}
                </div>
            </div>
        </div>

        <script>
            // Fetch webhook logs from storage
            async function fetchWebhookLogs() {
                try {
                    const response = await fetch('/api/webhook-storage');
                    const data = await response.json();
                    
                    const container = document.getElementById('webhook-logs-container');
                    const countSpan = document.getElementById('webhook-count');
                    
                    countSpan.textContent = '(' + data.count + ')';
                    
                    if (data.count === 0) {
                        container.innerHTML = '<div style="color: #6c757d; font-style: italic; font-size: 12px;">No webhook calls yet</div>';
                        return;
                    }
                    
                    container.innerHTML = data.logs.slice(0, 10).map(log => `
                        <div class="log-entry log-webhook" onclick="toggleLogDetails('wh-${log.id}')">
                            <div class="log-header">
                                <div>
                                    <div class="log-time">${log.time}</div>
                                    <div class="log-path">${log.action} - ${log.success ? 'SUCCESS' : 'ERROR'}</div>
                                </div>
                                <span class="log-expand">+</span>
                            </div>
                            <div id="details-wh-${log.id}" class="log-details">
                                <div class="log-tabs">
                                    <div class="log-tab active" onclick="showTab('wh-${log.id}', 'request')">Request</div>
                                    <div class="log-tab" onclick="showTab('wh-${log.id}', 'response')">Response</div>
                                </div>
                                <div id="tab-wh-${log.id}-request" class="tab-content">
                                    <pre>${JSON.stringify(log.requestData, null, 2)}</pre>
                                </div>
                                <div id="tab-wh-${log.id}-response" class="tab-content" style="display: none;">
                                    <pre>${JSON.stringify(log.responseData, null, 2)}</pre>
                                </div>
                            </div>
                        </div>
                    `).join('');
                    
                    console.log('📡 Fetched', data.count, 'webhook logs');
                } catch (error) {
                    console.error('Failed to fetch webhook logs:', error);
                    document.getElementById('webhook-logs-container').innerHTML = '<div style="color: red; font-size: 12px;">Error loading webhook logs</div>';
                }
            }
            
            function refreshLogs() {
                location.reload();
            }
            
            function clearLogs() {
                if (confirm('Clear all logs?')) {
                    Promise.all([
                        fetch('/api/logs', { method: 'DELETE' }),
                        fetch('/api/webhook-storage', { method: 'DELETE' })
                    ]).then(() => {
                        location.reload();
                    });
                }
            }
            
            function toggleLogDetails(logId) {
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
            
            function showTab(logId, tabName) {
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
            
            // Initialize webhook logs on page load
            document.addEventListener('DOMContentLoaded', () => {
                fetchWebhookLogs();
                
                // Auto-refresh webhook logs every 5 seconds
                setInterval(fetchWebhookLogs, 5000);
            });
            
            // Update timestamp every second
            setInterval(() => {
                document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
            }, 1000);
            
            // Full page refresh every 30 seconds (reduced frequency since webhook logs update separately)
            setInterval(() => {
                location.reload();
            }, 30000);
        </script>
    </body>
    </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
};