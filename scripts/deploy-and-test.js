#!/usr/bin/env node
/**
 * Deployment and Testing Script
 * 1. Commits changes to git
 * 2. Pushes to deployment
 * 3. Waits for deployment to be ready
 * 4. Runs comprehensive tests
 */

const { execSync } = require('child_process');
const dayjs = require('dayjs');

console.log('🚀 Starting Deployment and Testing Process...');

function runCommand(command, description) {
  console.log(`\n📋 ${description}...`);
  console.log(`Command: ${command}`);
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'inherit' 
    });
    console.log(`✅ ${description} completed successfully`);
    return output;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

async function main() {
  const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
  try {
    // 1. Git status check
    runCommand('git status', 'Checking git status');
    
    // 2. Add all changes
    runCommand('git add .', 'Adding all changes');
    
    // 3. Commit changes
    const commitMessage = `🧪 TEST: Disable Twilio and add comprehensive testing suite

- Disabled Twilio SMS for testing (TWILIO_ENABLED=false)
- Added comprehensive testing script with detailed logging
- Organized repository structure with proper service separation
- Added phone validation improvements for voice-to-text
- Ready for pre-production testing

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`;

    runCommand(`git commit -m "${commitMessage}"`, 'Committing changes');
    
    // 4. Push to deployment
    runCommand('git push origin main', 'Pushing to deployment');
    
    console.log('\n⏳ Waiting 30 seconds for deployment to complete...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // 5. Run comprehensive tests against production
    console.log('\n🧪 Running comprehensive tests against production...');
    process.env.NODE_ENV = 'production';
    
    runCommand('node scripts/comprehensive-testing.js', 'Running comprehensive tests');
    
    console.log('\n🎉 Deployment and testing completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Deployment and testing failed:', error.message);
    process.exit(1);
  }
}

main();