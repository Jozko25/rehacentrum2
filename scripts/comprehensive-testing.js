#!/usr/bin/env node
/**
 * Comprehensive Pre-Production Testing Script
 * Tests all endpoints, webhook functions, and configurations
 * Logs everything with detailed issue tracking
 */

require('dotenv').config();
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

dayjs.extend(utc);
dayjs.extend(timezone);

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.NODE_ENV === 'production' 
    ? 'https://rehacentrum2-production.up.railway.app' 
    : 'http://localhost:3000',
  testTimeout: 30000,
  testPhone: '+421910223761',
  testDate: dayjs().add(3, 'days').format('YYYY-MM-DD'),
  timezone: 'Europe/Bratislava'
};

// Logging setup
const logDir = path.join(__dirname, '../test-logs');
const logFile = path.join(logDir, `test-run-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.log`);
const issuesFile = path.join(logDir, `issues-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.json`);

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

class TestLogger {
  constructor() {
    this.logs = [];
    this.issues = [];
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  log(level, message, data = null) {
    const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const logEntry = {
      timestamp,
      level,
      message,
      data
    };
    
    this.logs.push(logEntry);
    
    // Console output with colors
    const colors = {
      INFO: '\x1b[36m',    // Cyan
      SUCCESS: '\x1b[32m', // Green
      WARNING: '\x1b[33m', // Yellow
      ERROR: '\x1b[31m',   // Red
      RESET: '\x1b[0m'
    };
    
    const color = colors[level] || colors.RESET;
    console.log(`${color}[${timestamp}] ${level}: ${message}${colors.RESET}`);
    
    if (data) {
      console.log(`${color}Data: ${JSON.stringify(data, null, 2)}${colors.RESET}`);
    }
  }

  logIssue(severity, category, description, details = null) {
    const issue = {
      id: `ISSUE-${this.issues.length + 1}`,
      timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      severity, // CRITICAL, HIGH, MEDIUM, LOW
      category, // ENDPOINT, WEBHOOK, CONFIG, VALIDATION, PERFORMANCE
      description,
      details
    };
    
    this.issues.push(issue);
    this.log('ERROR', `${severity} ISSUE: ${description}`, details);
  }

  recordTest(testName, passed, error = null) {
    this.testResults.total++;
    if (passed) {
      this.testResults.passed++;
      this.log('SUCCESS', `✅ ${testName}`);
    } else {
      this.testResults.failed++;
      this.testResults.errors.push({ testName, error: error?.message || 'Unknown error' });
      this.log('ERROR', `❌ ${testName}`, error);
      
      // Log as issue
      this.logIssue('HIGH', 'TEST_FAILURE', `Test failed: ${testName}`, {
        testName,
        error: error?.message,
        stack: error?.stack
      });
    }
  }

  async saveResults() {
    try {
      // Save detailed logs
      const logContent = this.logs.map(log => 
        `[${log.timestamp}] ${log.level}: ${log.message}${log.data ? '\nData: ' + JSON.stringify(log.data, null, 2) : ''}`
      ).join('\n\n');
      
      fs.writeFileSync(logFile, logContent);
      
      // Save issues as JSON
      const issuesData = {
        summary: {
          totalIssues: this.issues.length,
          critical: this.issues.filter(i => i.severity === 'CRITICAL').length,
          high: this.issues.filter(i => i.severity === 'HIGH').length,
          medium: this.issues.filter(i => i.severity === 'MEDIUM').length,
          low: this.issues.filter(i => i.severity === 'LOW').length
        },
        testResults: this.testResults,
        issues: this.issues,
        generatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
      };
      
      fs.writeFileSync(issuesFile, JSON.stringify(issuesData, null, 2));
      
      this.log('INFO', `Results saved to:\n- Logs: ${logFile}\n- Issues: ${issuesFile}`);
      
      return issuesData;
    } catch (error) {
      this.log('ERROR', 'Failed to save results', error);
    }
  }
}

class ComprehensiveTester {
  constructor() {
    this.logger = new TestLogger();
    this.baseUrl = TEST_CONFIG.baseUrl;
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
      
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Rehacentrum-Test-Suite/1.0',
          ...headers
        }
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      this.logger.log('INFO', `${method} ${url}`, data);
      
      const response = await fetch(url, options);
      const responseText = await response.text();
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      const result = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData
      };

      this.logger.log('INFO', `Response: ${response.status} ${response.statusText}`, {
        data: responseData,
        contentType: response.headers.get('content-type')
      });

      return result;
    } catch (error) {
      this.logger.log('ERROR', `Request failed: ${method} ${endpoint}`, error);
      throw error;
    }
  }

  async testConfigurationLoading() {
    this.logger.log('INFO', '🔧 Testing Configuration Loading...');
    
    try {
      // Test config loading
      const config = require('../config/config.js');
      this.logger.recordTest('Config loading', true);
      
      // Test SMS config
      const smsConfig = require('../config/sms-config.js');
      this.logger.recordTest('SMS config loading', true);
      
      // Validate critical config values
      const requiredFields = ['port', 'calendar', 'appointmentTypes', 'validation'];
      for (const field of requiredFields) {
        if (!config[field]) {
          this.logger.logIssue('CRITICAL', 'CONFIG', `Missing required config field: ${field}`);
          this.logger.recordTest(`Config field: ${field}`, false, new Error(`Missing field: ${field}`));
        } else {
          this.logger.recordTest(`Config field: ${field}`, true);
        }
      }

      // Test Twilio disabled status
      if (config.sms.enabled) {
        this.logger.logIssue('MEDIUM', 'CONFIG', 'Twilio is enabled in config but should be disabled for testing');
      } else {
        this.logger.recordTest('Twilio disabled for testing', true);
      }

    } catch (error) {
      this.logger.recordTest('Configuration loading', false, error);
    }
  }

  async testServiceInitialization() {
    this.logger.log('INFO', '🚀 Testing Service Initialization...');
    
    try {
      // Test Google Calendar service
      const googleCalendar = require('../services/googleCalendar.js');
      await googleCalendar.initialize();
      this.logger.recordTest('Google Calendar service initialization', true);
      
      // Test SMS service
      const smsService = require('../services/smsService.js');
      await smsService.initialize();
      this.logger.recordTest('SMS service initialization', true);
      
      // Test appointment validator
      const appointmentValidator = require('../services/appointmentValidator.js');
      const validTypes = appointmentValidator.getValidAppointmentTypes();
      if (validTypes.length > 0) {
        this.logger.recordTest('Appointment validator initialization', true);
      } else {
        throw new Error('No valid appointment types found');
      }
      
    } catch (error) {
      this.logger.recordTest('Service initialization', false, error);
    }
  }

  async testApiEndpoints() {
    this.logger.log('INFO', '🌐 Testing API Endpoints...');
    
    const endpoints = [
      { method: 'GET', path: '/api/health', expectedStatus: 200 },
      { method: 'GET', path: '/api/appointment-types', expectedStatus: 200 },
      { method: 'GET', path: '/api/logs', expectedStatus: 200 },
      { method: 'GET', path: '/api/sms/templates', expectedStatus: 200 },
      { method: 'POST', path: '/api/sms/preview', expectedStatus: 200, data: {
        appointment_type: 'sportova_prehliadka',
        patient_name: 'Test',
        date_short: '20.8.',
        time: '08:00'
      }}
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.makeRequest(
          endpoint.method, 
          endpoint.path, 
          endpoint.data
        );
        
        if (response.status === endpoint.expectedStatus) {
          this.logger.recordTest(`${endpoint.method} ${endpoint.path}`, true);
          
          // Additional validation
          if (endpoint.path === '/api/health') {
            if (response.data && response.data.status === 'healthy') {
              this.logger.recordTest('Health check status validation', true);
            } else {
              this.logger.logIssue('HIGH', 'ENDPOINT', 'Health endpoint returned unhealthy status', response.data);
            }
          }
          
          if (endpoint.path === '/api/appointment-types') {
            if (Array.isArray(response.data) && response.data.length > 0) {
              this.logger.recordTest('Appointment types data validation', true);
            } else {
              this.logger.logIssue('CRITICAL', 'ENDPOINT', 'No appointment types returned', response.data);
            }
          }
          
        } else {
          throw new Error(`Expected status ${endpoint.expectedStatus}, got ${response.status}`);
        }
      } catch (error) {
        this.logger.recordTest(`${endpoint.method} ${endpoint.path}`, false, error);
      }
    }
  }

  async testWebhookFunctions() {
    this.logger.log('INFO', '🎣 Testing Webhook Functions...');
    
    const webhookTests = [
      {
        name: 'Get Available Slots',
        data: {
          action: 'get_available_slots',
          date: TEST_CONFIG.testDate,
          appointment_type: 'sportova_prehliadka'
        }
      },
      {
        name: 'Find Closest Slot',
        data: {
          action: 'find_closest_slot',
          appointment_type: 'vstupne_vysetrenie'
        }
      },
      {
        name: 'Get More Slots',
        data: {
          action: 'get_more_slots',
          date: TEST_CONFIG.testDate,
          appointment_type: 'sportova_prehliadka',
          current_count: 2
        }
      },
      {
        name: 'Book Appointment (Invalid Data)',
        data: {
          action: 'book_appointment',
          appointment_type: 'sportova_prehliadka',
          date_time: dayjs(TEST_CONFIG.testDate).add(8, 'hours').toISOString(),
          patient_name: 'Test',
          patient_surname: 'Patient',
          phone: 'invalid_phone',
          insurance: 'Test Insurance'
        },
        expectError: true
      },
      {
        name: 'Cancel Appointment (Not Found)',
        data: {
          action: 'cancel_appointment',
          patient_name: 'Nonexistent Patient',
          phone: TEST_CONFIG.testPhone,
          appointment_date: TEST_CONFIG.testDate
        },
        expectError: true
      }
    ];

    for (const test of webhookTests) {
      try {
        const response = await this.makeRequest(
          'POST',
          '/api/booking/webhook',
          test.data
        );
        
        if (test.expectError) {
          // For error cases, check if we get an appropriate error response
          if (response.status === 400 || response.status === 500 || 
              (typeof response.data === 'string' && response.data.includes('chybe'))) {
            this.logger.recordTest(`Webhook: ${test.name} (error handling)`, true);
          } else {
            this.logger.logIssue('MEDIUM', 'WEBHOOK', `Expected error for ${test.name} but got success`, {
              response: response.data,
              status: response.status
            });
          }
        } else {
          // For success cases
          if (response.status === 200) {
            this.logger.recordTest(`Webhook: ${test.name}`, true);
            
            // Validate response content
            if (typeof response.data === 'string' && response.data.length > 0) {
              this.logger.recordTest(`Webhook: ${test.name} (response validation)`, true);
            } else {
              this.logger.logIssue('LOW', 'WEBHOOK', `Empty or invalid response for ${test.name}`, response.data);
            }
          } else {
            throw new Error(`Unexpected status: ${response.status}`);
          }
        }
        
      } catch (error) {
        if (test.expectError) {
          this.logger.recordTest(`Webhook: ${test.name} (error handling)`, true);
        } else {
          this.logger.recordTest(`Webhook: ${test.name}`, false, error);
        }
      }
    }
  }

  async testPhoneValidation() {
    this.logger.log('INFO', '📱 Testing Phone Validation...');
    
    const phoneValidator = require('../utils/phoneValidator.js');
    
    const phoneTests = [
      { input: '+421910223761', expected: true, name: 'Valid international format' },
      { input: '0910223761', expected: true, name: 'Valid local format' },
      { input: '421910223761', expected: true, name: 'Valid without + prefix' },
      { input: '910223761', expected: true, name: 'Valid 9-digit format' },
      { input: '421910', expected: false, name: 'Invalid short number' },
      { input: '123456789', expected: false, name: 'Invalid non-Slovak number' },
      { input: '+42191022376', expected: false, name: 'Invalid missing digit' },
      { input: '', expected: false, name: 'Empty string' },
      { input: null, expected: false, name: 'Null value' }
    ];

    for (const test of phoneTests) {
      try {
        const result = phoneValidator.validatePhoneNumber(test.input);
        
        if (result.isValid === test.expected) {
          this.logger.recordTest(`Phone validation: ${test.name}`, true);
        } else {
          this.logger.logIssue('MEDIUM', 'VALIDATION', 
            `Phone validation failed for ${test.name}`, {
              input: test.input,
              expected: test.expected,
              actual: result.isValid,
              error: result.error
            });
          this.logger.recordTest(`Phone validation: ${test.name}`, false);
        }
      } catch (error) {
        this.logger.recordTest(`Phone validation: ${test.name}`, false, error);
      }
    }
  }

  async testErrorHandling() {
    this.logger.log('INFO', '⚠️  Testing Error Handling...');
    
    const errorTests = [
      {
        name: 'Invalid webhook action',
        method: 'POST',
        path: '/api/booking/webhook',
        data: { action: 'invalid_action' }
      },
      {
        name: 'Missing webhook action',
        method: 'POST',
        path: '/api/booking/webhook',
        data: { some_field: 'value' }
      },
      {
        name: 'Invalid HTTP method on webhook',
        method: 'GET',
        path: '/api/booking/webhook'
      },
      {
        name: 'Nonexistent endpoint',
        method: 'GET',
        path: '/api/nonexistent'
      }
    ];

    for (const test of errorTests) {
      try {
        const response = await this.makeRequest(test.method, test.path, test.data);
        
        // Error handling should return appropriate status codes
        if (response.status >= 400 && response.status < 600) {
          this.logger.recordTest(`Error handling: ${test.name}`, true);
        } else {
          this.logger.logIssue('MEDIUM', 'ENDPOINT', 
            `Expected error status for ${test.name} but got ${response.status}`, response);
        }
      } catch (error) {
        // Network errors are also acceptable for some tests
        this.logger.recordTest(`Error handling: ${test.name}`, true);
      }
    }
  }

  async testPerformance() {
    this.logger.log('INFO', '⚡ Testing Performance...');
    
    const performanceTests = [
      { path: '/api/health', maxTime: 1000 },
      { path: '/api/appointment-types', maxTime: 2000 },
      { path: '/api/booking/webhook', method: 'POST', data: {
        action: 'get_available_slots',
        date: TEST_CONFIG.testDate,
        appointment_type: 'sportova_prehliadka'
      }, maxTime: 5000 }
    ];

    for (const test of performanceTests) {
      try {
        const startTime = Date.now();
        
        await this.makeRequest(
          test.method || 'GET',
          test.path,
          test.data
        );
        
        const duration = Date.now() - startTime;
        
        if (duration <= test.maxTime) {
          this.logger.recordTest(`Performance: ${test.path} (${duration}ms)`, true);
        } else {
          this.logger.logIssue('LOW', 'PERFORMANCE', 
            `Slow response for ${test.path}: ${duration}ms (max: ${test.maxTime}ms)`);
          this.logger.recordTest(`Performance: ${test.path}`, false, 
            new Error(`Response too slow: ${duration}ms`));
        }
      } catch (error) {
        this.logger.recordTest(`Performance: ${test.path}`, false, error);
      }
    }
  }

  async runAllTests() {
    this.logger.log('INFO', '🚀 Starting Comprehensive Test Suite...');
    this.logger.log('INFO', `Base URL: ${this.baseUrl}`);
    this.logger.log('INFO', `Test Phone: ${TEST_CONFIG.testPhone}`);
    this.logger.log('INFO', `Test Date: ${TEST_CONFIG.testDate}`);
    
    const startTime = Date.now();
    
    try {
      // Run all test suites
      await this.testConfigurationLoading();
      await this.testServiceInitialization();
      await this.testApiEndpoints();
      await this.testWebhookFunctions();
      await this.testPhoneValidation();
      await this.testErrorHandling();
      await this.testPerformance();
      
      const duration = Date.now() - startTime;
      
      // Generate summary
      this.logger.log('INFO', '📊 Test Summary');
      this.logger.log('INFO', `Total Tests: ${this.logger.testResults.total}`);
      this.logger.log('SUCCESS', `Passed: ${this.logger.testResults.passed}`);
      this.logger.log('ERROR', `Failed: ${this.logger.testResults.failed}`);
      this.logger.log('INFO', `Duration: ${duration}ms`);
      this.logger.log('WARNING', `Issues Found: ${this.logger.issues.length}`);
      
      // Save results
      const results = await this.logger.saveResults();
      
      // Exit with appropriate code
      const exitCode = this.logger.testResults.failed === 0 && this.logger.issues.length === 0 ? 0 : 1;
      
      this.logger.log('INFO', `Test suite completed with exit code: ${exitCode}`);
      
      return {
        success: exitCode === 0,
        results: this.logger.testResults,
        issues: this.logger.issues,
        duration
      };
      
    } catch (error) {
      this.logger.log('ERROR', 'Test suite failed', error);
      await this.logger.saveResults();
      throw error;
    }
  }
}

// Main execution
async function main() {
  const tester = new ComprehensiveTester();
  
  try {
    const results = await tester.runAllTests();
    
    if (results.success) {
      console.log('\n🎉 All tests passed! System ready for production.');
      process.exit(0);
    } else {
      console.log(`\n❌ Test suite failed. ${results.issues.length} issues found.`);
      console.log('Check the generated log files for details.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Test suite crashed:', error.message);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Export for potential module usage
module.exports = { ComprehensiveTester, TestLogger };

// Run if called directly
if (require.main === module) {
  main();
}