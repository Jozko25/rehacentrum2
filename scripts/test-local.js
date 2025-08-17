#!/usr/bin/env node
/**
 * Local Testing Script
 * Tests the application locally before deployment
 */

const { spawn } = require('child_process');
const { ComprehensiveTester } = require('./comprehensive-testing.js');

console.log('🧪 Starting Local Testing...');

async function testLocal() {
  try {
    // Set environment for local testing
    process.env.NODE_ENV = 'development';
    
    console.log('📋 Testing configuration and services locally...');
    
    const tester = new ComprehensiveTester();
    
    // Run only safe tests (no actual HTTP requests)
    await tester.testConfigurationLoading();
    await tester.testServiceInitialization();
    await tester.testPhoneValidation();
    
    // Save results
    await tester.logger.saveResults();
    
    console.log('\n📊 Local Test Summary:');
    console.log(`Total Tests: ${tester.logger.testResults.total}`);
    console.log(`Passed: ${tester.logger.testResults.passed}`);
    console.log(`Failed: ${tester.logger.testResults.failed}`);
    console.log(`Issues: ${tester.logger.issues.length}`);
    
    if (tester.logger.testResults.failed === 0) {
      console.log('\n✅ Local tests passed! Ready for deployment.');
      return true;
    } else {
      console.log('\n❌ Local tests failed. Fix issues before deployment.');
      return false;
    }
    
  } catch (error) {
    console.error('\n💥 Local testing failed:', error.message);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  testLocal().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testLocal };