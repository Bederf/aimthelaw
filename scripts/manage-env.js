#!/usr/bin/env node
/**
 * Environment Variable Management Script
 * 
 * This script helps manage environment variables across different environments.
 * It can:
 * 1. Create backups of environment files
 * 2. Switch between different environment configurations
 * 3. Validate environment files for required variables
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_DIR = path.join(ROOT_DIR, 'env');
const ACTIVE_ENV_FILES = [
  '.env',
  '.env.development',
  '.env.production',
  '.env.ngrok'
].map(file => path.join(ROOT_DIR, file));

// Required variables for the application to function
const REQUIRED_VARS = [
  'VITE_API_BASE_URL'
];

// Helper function to create a backup
function createBackup(envFile) {
  if (!fs.existsSync(envFile)) {
    console.log(`${envFile} does not exist, no backup needed.`);
    return;
  }
  
  const filename = path.basename(envFile);
  const date = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(ENV_DIR, `${filename}.${date}.bak`);
  
  fs.copyFileSync(envFile, backupFile);
  console.log(`Created backup: ${backupFile}`);
}

// Helper function to validate an environment file
function validateEnvFile(envFile) {
  if (!fs.existsSync(envFile)) {
    return { valid: false, reason: 'File does not exist' };
  }
  
  const content = fs.readFileSync(envFile, 'utf8');
  const lines = content.split('\n');
  const variables = {};
  
  lines.forEach(line => {
    if (!line.trim() || line.startsWith('#')) return;
    
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      variables[match[1].trim()] = match[2].trim();
    }
  });
  
  const missingVars = REQUIRED_VARS.filter(v => !(v in variables));
  
  return {
    valid: missingVars.length === 0,
    reason: missingVars.length ? `Missing required variables: ${missingVars.join(', ')}` : '',
    variables
  };
}

// Create backup of all environment files
function backupAllEnvFiles() {
  ACTIVE_ENV_FILES.forEach(file => createBackup(file));
  console.log('All environment files backed up successfully.');
}

// Main CLI interface
function showMainMenu() {
  console.log('\nEnvironment Management Tool');
  console.log('=========================');
  console.log('1. Create backup of all environment files');
  console.log('2. Validate environment files');
  console.log('3. Exit');
  
  rl.question('\nSelect an option: ', (answer) => {
    switch (answer.trim()) {
      case '1':
        backupAllEnvFiles();
        showMainMenu();
        break;
      case '2':
        validateAllEnvFiles();
        showMainMenu();
        break;
      case '3':
        rl.close();
        break;
      default:
        console.log('Invalid option.');
        showMainMenu();
        break;
    }
  });
}

// Validate all environment files
function validateAllEnvFiles() {
  console.log('\nValidating environment files:');
  console.log('============================');
  
  ACTIVE_ENV_FILES.forEach(file => {
    const result = validateEnvFile(file);
    console.log(`\n${path.basename(file)}:`);
    
    if (result.valid) {
      console.log('✅ Valid');
    } else {
      console.log(`❌ Invalid: ${result.reason}`);
    }
  });
}

// Ensure the env directory exists
if (!fs.existsSync(ENV_DIR)) {
  fs.mkdirSync(ENV_DIR, { recursive: true });
  console.log(`Created environment directory: ${ENV_DIR}`);
}

// Start the CLI
showMainMenu(); 