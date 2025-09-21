#!/usr/bin/env node

/**
 * API Key Generator
 * 
 * Generates secure API keys for the email forwarding service.
 * Usage: node scripts/generate-api-key.js [count] [prefix]
 */

const crypto = require('crypto');

function generateApiKey(prefix = 'efs', length = 32) {
  // Generate random bytes and convert to base64url (URL-safe)
  const randomBytes = crypto.randomBytes(length);
  const base64url = randomBytes
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${prefix}_${base64url}`;
}

function main() {
  const args = process.argv.slice(2);
  const count = parseInt(args[0]) || 1;
  const prefix = args[1] || 'efs';
  
  console.log('🔑 Email Forwarding Service - API Key Generator\n');
  
  if (count === 1) {
    const apiKey = generateApiKey(prefix);
    console.log('Generated API Key:');
    console.log(`${apiKey}\n`);
    console.log('Add this to your .env file:');
    console.log(`API_KEYS=${apiKey}`);
    console.log('\nOr append to existing keys:');
    console.log(`API_KEYS=existing-key-1,existing-key-2,${apiKey}`);
  } else {
    console.log(`Generated ${count} API Keys:\n`);
    const keys = [];
    
    for (let i = 0; i < count; i++) {
      const apiKey = generateApiKey(prefix);
      keys.push(apiKey);
      console.log(`${i + 1}. ${apiKey}`);
    }
    
    console.log('\nAdd these to your .env file:');
    console.log(`API_KEYS=${keys.join(',')}`);
  }
  
  console.log('\n📋 Configuration:');
  console.log('API_KEY_REQUIRED=true');
  console.log('API_KEY_HEADER=x-api-key');
  
  console.log('\n🔒 Security Notes:');
  console.log('- Store API keys securely');
  console.log('- Use different keys for different environments');
  console.log('- Rotate keys regularly');
  console.log('- Never commit keys to version control');
  console.log('- Use environment variables or secure vaults');
}

if (require.main === module) {
  main();
}

module.exports = { generateApiKey };
