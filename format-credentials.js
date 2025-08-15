#!/usr/bin/env node

/**
 * Format Google Service Account credentials for Railway deployment
 * This script ensures proper JSON formatting with escaped newlines in private_key
 */

const fs = require('fs');
const path = require('path');

const credentialsPath = path.join(__dirname, 'credentials.json');

if (!fs.existsSync(credentialsPath)) {
    console.error('❌ credentials.json file not found!');
    console.log('📝 Make sure credentials.json is in the project root');
    process.exit(1);
}

try {
    // Read the credentials file
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    // Ensure private_key has proper escaped newlines
    if (credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\n/g, '\\n');
    }
    
    // Create formatted JSON string (compact, no whitespace)
    const formatted = JSON.stringify(credentials);
    
    console.log('✅ Formatted Google Credentials for Railway:');
    console.log('');
    console.log('🔧 Copy this EXACT value to Railway environment variable GOOGLE_CREDENTIALS:');
    console.log('');
    console.log(formatted);
    console.log('');
    console.log('📋 Railway Environment Variable Setup:');
    console.log('1. Go to your Railway project dashboard');
    console.log('2. Click on Variables tab');
    console.log('3. Add variable: GOOGLE_CREDENTIALS');
    console.log('4. Paste the JSON above as the value');
    console.log('5. Deploy your app');
    console.log('');
    
} catch (error) {
    console.error('❌ Error reading credentials file:', error.message);
    console.log('📝 Make sure credentials.json contains valid JSON');
    process.exit(1);
}
