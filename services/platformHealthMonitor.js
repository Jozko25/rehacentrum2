const fetch = require('node-fetch');
const vapiConfig = require('../config/vapi-config');
const { addLog } = require('../lib/logger');

class PlatformHealthMonitor {
  constructor() {
    this.isMonitoring = false;
    this.healthStatus = {
      elevenlabs: {
        status: 'unknown',
        lastCheck: null,
        lastSuccess: null,
        failureCount: 0,
        responseTime: null
      },
      vapi: {
        status: 'unknown',
        lastCheck: null,
        lastSuccess: null,
        failureCount: 0,
        responseTime: null
      }
    };
    this.activePlatform = 'elevenlabs'; // Default primary platform
    this.monitoringInterval = null;
    this.callbacks = {
      onFailover: [],
      onRecovery: [],
      onStatusChange: []
    };
  }

  // Start health monitoring
  startMonitoring() {
    if (this.isMonitoring) return;

    if (!vapiConfig.healthCheck.enabled) {
      addLog('warning', 'Platform health monitoring is disabled');
      return;
    }

    this.isMonitoring = true;
    const interval = vapiConfig.healthCheck.elevenlabsHealthCheckInterval;
    
    addLog('success', `Starting platform health monitoring (interval: ${interval}ms)`);
    
    // Initial health check
    this.checkAllPlatforms();
    
    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.checkAllPlatforms();
    }, interval);
  }

  // Stop health monitoring
  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    addLog('warning', 'Platform health monitoring stopped');
  }

  // Check health of all platforms
  async checkAllPlatforms() {
    const checks = [this.checkElevenLabsHealth()];
    
    // Only check VAPI if it's enabled
    if (vapiConfig.api.enabled) {
      checks.push(this.checkVapiHealth());
    }
    
    await Promise.all(checks);
    this.evaluateFailover();
  }

  // Check ElevenLabs health
  async checkElevenLabsHealth() {
    const startTime = Date.now();
    const status = this.healthStatus.elevenlabs;
    
    try {
      // Check ElevenLabs API
      const response = await fetch(vapiConfig.healthCheck.elevenlabsHealthEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      const responseTime = Date.now() - startTime;
      status.lastCheck = new Date().toISOString();
      status.responseTime = responseTime;

      if (response.ok) {
        const wasDown = status.status === 'down';
        status.status = 'up';
        status.lastSuccess = status.lastCheck;
        status.failureCount = 0;

        if (wasDown) {
          addLog('success', `ElevenLabs recovered (${responseTime}ms)`);
          this.triggerCallbacks('onRecovery', 'elevenlabs');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      status.lastCheck = new Date().toISOString();
      status.responseTime = responseTime;
      status.status = 'down';
      status.failureCount++;

      addLog('error', `ElevenLabs health check failed: ${error.message} (${responseTime}ms, failures: ${status.failureCount})`);
      
      // Trigger failover after multiple consecutive failures
      if (status.failureCount >= vapiConfig.healthCheck.maxRetries) {
        this.triggerCallbacks('onFailover', 'elevenlabs');
      }
    }

    this.triggerCallbacks('onStatusChange', 'elevenlabs', status);
  }

  // Check VAPI.ai health
  async checkVapiHealth() {
    const startTime = Date.now();
    const status = this.healthStatus.vapi;
    
    try {
      // Check VAPI.ai API (using a simple ping endpoint)
      const response = await fetch(`${vapiConfig.api.baseUrl}/assistant`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${vapiConfig.api.apiKey}`,
          'Accept': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      const responseTime = Date.now() - startTime;
      status.lastCheck = new Date().toISOString();
      status.responseTime = responseTime;

      if (response.ok) {
        const wasDown = status.status === 'down';
        status.status = 'up';
        status.lastSuccess = status.lastCheck;
        status.failureCount = 0;

        if (wasDown) {
          addLog('success', `VAPI.ai recovered (${responseTime}ms)`);
          this.triggerCallbacks('onRecovery', 'vapi');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      status.lastCheck = new Date().toISOString();
      status.responseTime = responseTime;
      status.status = 'down';
      status.failureCount++;

      addLog('warning', `VAPI.ai health check failed: ${error.message} (${responseTime}ms, failures: ${status.failureCount})`);
    }

    this.triggerCallbacks('onStatusChange', 'vapi', status);
  }

  // Evaluate if failover is needed
  evaluateFailover() {
    const elevenlabsStatus = this.healthStatus.elevenlabs;
    const vapiStatus = this.healthStatus.vapi;
    const forcePlatform = vapiConfig.platform.forcePlatform;

    // Check if platform is manually forced
    if (forcePlatform !== 'auto') {
      if (this.activePlatform !== forcePlatform) {
        addLog('warning', `Platform manually switched to: ${forcePlatform}`);
        this.activePlatform = forcePlatform;
        this.triggerCallbacks('onFailover', forcePlatform);
      }
      return;
    }

    // Auto-failover logic
    const elevenlabsDown = elevenlabsStatus.status === 'down' && 
                          elevenlabsStatus.failureCount >= vapiConfig.healthCheck.maxRetries;
    const vapiUp = vapiStatus.status === 'up';

    // Failover to VAPI when ElevenLabs is down
    if (elevenlabsDown && vapiUp && this.activePlatform === 'elevenlabs') {
      addLog('error', 'ElevenLabs is down - failing over to VAPI.ai');
      this.activePlatform = 'vapi';
      this.triggerCallbacks('onFailover', 'vapi');
      return;
    }

    // Failback to ElevenLabs when it recovers (if it's the priority platform)
    const elevenlabsUp = elevenlabsStatus.status === 'up';
    const isPriorityPlatform = vapiConfig.platform.priorityPlatform === 'elevenlabs';
    
    if (elevenlabsUp && isPriorityPlatform && this.activePlatform === 'vapi') {
      addLog('success', 'ElevenLabs recovered - failing back from VAPI.ai');
      this.activePlatform = 'elevenlabs';
      this.triggerCallbacks('onRecovery', 'elevenlabs');
      return;
    }
  }

  // Get current platform to use for new calls
  getActivePlatform() {
    return this.activePlatform;
  }

  // Get health status for all platforms
  getHealthStatus() {
    return {
      activePlatform: this.activePlatform,
      isMonitoring: this.isMonitoring,
      platforms: { ...this.healthStatus },
      configuration: {
        enabled: vapiConfig.healthCheck.enabled,
        interval: vapiConfig.healthCheck.elevenlabsHealthCheckInterval,
        maxRetries: vapiConfig.healthCheck.maxRetries,
        forcePlatform: vapiConfig.platform.forcePlatform,
        priorityPlatform: vapiConfig.platform.priorityPlatform
      }
    };
  }

  // Register callback for platform events
  onFailover(callback) {
    this.callbacks.onFailover.push(callback);
  }

  onRecovery(callback) {
    this.callbacks.onRecovery.push(callback);
  }

  onStatusChange(callback) {
    this.callbacks.onStatusChange.push(callback);
  }

  // Trigger callbacks
  triggerCallbacks(event, platform, data = null) {
    this.callbacks[event].forEach(callback => {
      try {
        callback(platform, data);
      } catch (error) {
        addLog('error', `Callback error for ${event}: ${error.message}`);
      }
    });
  }

  // Force platform switch (for manual override)
  forcePlatform(platform) {
    if (!['elevenlabs', 'vapi', 'auto'].includes(platform)) {
      throw new Error('Invalid platform. Must be: elevenlabs, vapi, or auto');
    }

    vapiConfig.platform.forcePlatform = platform;
    
    if (platform !== 'auto') {
      addLog('warning', `Platform manually forced to: ${platform}`);
      this.activePlatform = platform;
      this.triggerCallbacks('onFailover', platform);
    } else {
      addLog('success', 'Platform switching returned to automatic mode');
      this.evaluateFailover();
    }
  }

  // Get platform statistics
  getStatistics() {
    const stats = {
      uptime: {},
      averageResponseTime: {},
      totalFailures: {}
    };

    Object.keys(this.healthStatus).forEach(platform => {
      const status = this.healthStatus[platform];
      stats.uptime[platform] = status.status === 'up' ? '100%' : '0%'; // Simplified
      stats.averageResponseTime[platform] = status.responseTime ? `${status.responseTime}ms` : 'N/A';
      stats.totalFailures[platform] = status.failureCount;
    });

    return stats;
  }
}

// Create singleton instance
const platformHealthMonitor = new PlatformHealthMonitor();

module.exports = platformHealthMonitor;