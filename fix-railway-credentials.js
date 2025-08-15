#!/usr/bin/env node

/**
 * Fix Railway Google Credentials formatting
 * This ensures the private_key has actual newlines, not escaped ones
 */

const fs = require('fs');
const path = require('path');

const credentialsPath = path.join(__dirname, 'new_credentials.json');

if (!fs.existsSync(credentialsPath)) {
    console.error('❌ new_credentials.json file not found!');
    process.exit(1);
}

try {
    // Read the credentials file
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    // Create Railway-specific formatting
    // Keep the private_key with actual \n characters (no double escaping)
    const railwayCredentials = {
        ...credentials
    };
    
    // Ensure private_key uses \n (not \\n) - Railway will handle the escaping
    if (railwayCredentials.private_key && railwayCredentials.private_key.includes('\\n')) {
        railwayCredentials.private_key = railwayCredentials.private_key.replace(/\\n/g, '\n');
    }
    
    // Create the final JSON string without extra escaping
    const formattedJson = JSON.stringify(railwayCredentials);
    
    console.log('✅ Railway-Ready Google Credentials:');
    console.log('');
    console.log('🔧 Copy this EXACT value to Railway GOOGLE_CREDENTIALS:');
    console.log('');
    console.log(formattedJson);
    console.log('');
    console.log('📝 Important Notes:');
    console.log('- This version uses actual newlines in private_key');
    console.log('- Railway will handle proper escaping automatically');
    console.log('- Do NOT manually escape the \\n characters');
    console.log('');
    console.log('🚂 Railway Setup:');
    console.log('1. Go to Railway project dashboard');
    console.log('2. Variables tab → Edit GOOGLE_CREDENTIALS');
    console.log('3. Paste the JSON above');
    console.log('4. Save and redeploy');
    
} catch (error) {
    console.error('❌ Error processing credentials:', error);
    process.exit(1);
}
