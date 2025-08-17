const vapiConfig = require('../config/vapi-config');
const platformHealthMonitor = require('./platformHealthMonitor');
const { addLog } = require('../lib/logger');

class PlatformManager {
  constructor() {
    this.initialized = false;
    this.callRouting = {
      totalCalls: 0,
      elevenlabsCalls: 0,
      vapiCalls: 0,
      failovers: 0,
      lastFailover: null
    };
  }

  // Initialize platform management
  async initialize() {
    if (this.initialized) return;

    try {
      // Set up health monitoring callbacks
      platformHealthMonitor.onFailover((platform) => {
        this.callRouting.failovers++;
        this.callRouting.lastFailover = new Date().toISOString();
        addLog('warning', `Platform failover to: ${platform}`);
      });

      platformHealthMonitor.onRecovery((platform) => {
        addLog('success', `Platform recovery: ${platform}`);
      });

      // Start health monitoring if enabled
      if (vapiConfig.healthCheck.enabled) {
        platformHealthMonitor.startMonitoring();
      }

      this.initialized = true;
      addLog('success', 'Platform manager initialized');
    } catch (error) {
      addLog('error', `Failed to initialize platform manager: ${error.message}`);
      throw error;
    }
  }

  // Get the appropriate webhook URL for new calls
  getWebhookEndpoint() {
    const activePlatform = platformHealthMonitor.getActivePlatform();
    
    if (activePlatform === 'vapi') {
      this.callRouting.vapiCalls++;
      return {
        platform: 'vapi',
        endpoint: '/api/booking/vapi-webhook',
        fullUrl: `${process.env.BASE_URL || 'https://rehacentrum2-production.up.railway.app'}/api/booking/vapi-webhook`
      };
    } else {
      this.callRouting.elevenlabsCalls++;
      return {
        platform: 'elevenlabs',
        endpoint: '/api/booking/webhook',
        fullUrl: `${process.env.BASE_URL || 'https://rehacentrum2-production.up.railway.app'}/api/booking/webhook`
      };
    }
  }

  // Get platform configuration for external systems (like Zadarma)
  getPlatformConfig() {
    const activePlatform = platformHealthMonitor.getActivePlatform();
    const healthStatus = platformHealthMonitor.getHealthStatus();
    
    return {
      activePlatform,
      webhookEndpoint: this.getWebhookEndpoint(),
      healthStatus,
      callRouting: { ...this.callRouting, totalCalls: this.callRouting.elevenlabsCalls + this.callRouting.vapiCalls },
      recommendation: this.getPlatformRecommendation()
    };
  }

  // Get platform recommendation based on current status
  getPlatformRecommendation() {
    const healthStatus = platformHealthMonitor.getHealthStatus();
    const elevenlabsStatus = healthStatus.platforms.elevenlabs;
    const vapiStatus = healthStatus.platforms.vapi;

    if (elevenlabsStatus.status === 'up' && vapiStatus.status === 'up') {
      return {
        status: 'both_available',
        message: 'Both platforms are healthy',
        recommended: vapiConfig.platform.priorityPlatform
      };
    } else if (elevenlabsStatus.status === 'up' && vapiStatus.status !== 'up') {
      return {
        status: 'elevenlabs_only',
        message: 'ElevenLabs available, VAPI.ai down',
        recommended: 'elevenlabs'
      };
    } else if (elevenlabsStatus.status !== 'up' && vapiStatus.status === 'up') {
      return {
        status: 'vapi_only',
        message: 'VAPI.ai available, ElevenLabs down',
        recommended: 'vapi'
      };
    } else {
      return {
        status: 'both_down',
        message: 'Both platforms are experiencing issues',
        recommended: 'none',
        alert: 'CRITICAL: No voice platforms available'
      };
    }
  }

  // Manual platform control
  async switchPlatform(platform, reason = 'Manual override') {
    try {
      platformHealthMonitor.forcePlatform(platform);
      
      addLog('warning', `Platform manually switched to ${platform}: ${reason}`);
      
      return {
        success: true,
        previousPlatform: platformHealthMonitor.getActivePlatform(),
        newPlatform: platform,
        reason
      };
    } catch (error) {
      addLog('error', `Failed to switch platform: ${error.message}`);
      throw error;
    }
  }

  // Get comprehensive platform status
  getStatus() {
    const healthStatus = platformHealthMonitor.getHealthStatus();
    const recommendation = this.getPlatformRecommendation();
    
    return {
      initialized: this.initialized,
      monitoring: healthStatus.isMonitoring,
      activePlatform: healthStatus.activePlatform,
      platforms: {
        elevenlabs: {
          ...healthStatus.platforms.elevenlabs,
          endpoint: '/api/booking/webhook',
          calls: this.callRouting.elevenlabsCalls
        },
        vapi: {
          ...healthStatus.platforms.vapi,
          endpoint: '/api/booking/vapi-webhook',
          calls: this.callRouting.vapiCalls
        }
      },
      callRouting: {
        ...this.callRouting,
        totalCalls: this.callRouting.elevenlabsCalls + this.callRouting.vapiCalls
      },
      recommendation,
      configuration: healthStatus.configuration
    };
  }

  // Reset call statistics
  resetStatistics() {
    this.callRouting = {
      totalCalls: 0,
      elevenlabsCalls: 0,
      vapiCalls: 0,
      failovers: 0,
      lastFailover: null
    };
    
    addLog('success', 'Platform statistics reset');
  }

  // Get Zadarma configuration for current active platform
  getZadarmaConfig() {
    const activePlatform = platformHealthMonitor.getActivePlatform();
    const webhook = this.getWebhookEndpoint();
    
    return {
      platform: activePlatform,
      webhookUrl: webhook.fullUrl,
      configuration: {
        elevenlabs: {
          webhookUrl: `${process.env.BASE_URL || 'https://rehacentrum2-production.up.railway.app'}/api/booking/webhook`,
          description: 'Primary voice platform (ElevenLabs)'
        },
        vapi: {
          webhookUrl: `${process.env.BASE_URL || 'https://rehacentrum2-production.up.railway.app'}/api/booking/vapi-webhook`,
          description: 'Fallback voice platform (VAPI.ai)'
        }
      },
      instructions: {
        manual_switch: 'Use the admin panel to manually switch platforms',
        automatic_failover: 'System will automatically switch when ElevenLabs is down',
        health_monitoring: 'Both platforms are monitored every 30 seconds'
      }
    };
  }

  // Shutdown platform manager
  shutdown() {
    if (platformHealthMonitor.isMonitoring) {
      platformHealthMonitor.stopMonitoring();
    }
    
    this.initialized = false;
    addLog('warning', 'Platform manager shut down');
  }
}

// Create singleton instance
const platformManager = new PlatformManager();

module.exports = platformManager;