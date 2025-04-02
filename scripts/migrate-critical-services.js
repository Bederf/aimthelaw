#!/usr/bin/env node
/**
 * Script to migrate critical services from console.log to logger
 * 
 * Usage:
 * node scripts/migrate-critical-services.js
 * 
 * This script will automatically migrate the most critical services
 * from using console.log to the new logger utility.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const APPLY_SCRIPT = path.join(__dirname, 'apply-logger-migration.js');
const SRC_DIR = path.join(__dirname, '..', 'src');

// Critical services that should be migrated first
const CRITICAL_SERVICES = [
  'modernAIService.ts',
  'aiService.ts',
  'unifiedAIService.ts',
  'apiClient.ts',
  'errorService.ts',
  'loggingService.ts',
  'tokenService.ts',
  'authService.ts',
  'billingService.ts'
];

// Migrate a specific file
function migrateFile(filePath) {
  console.log(`\n==== Migrating ${filePath} ====`);
  
  try {
    execSync(`node ${APPLY_SCRIPT} ${filePath}`, { 
      stdio: 'inherit',
      encoding: 'utf8'
    });
    console.log(`Successfully migrated ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error migrating ${filePath}: ${error.message}`);
    return false;
  }
}

// Find and migrate critical services
function migrateCriticalServices() {
  console.log('Starting migration of critical services...');
  
  // Track successful and failed migrations
  const results = {
    success: [],
    failed: []
  };
  
  // Find each critical service file
  CRITICAL_SERVICES.forEach(serviceName => {
    const servicePath = path.join(SRC_DIR, 'services', serviceName);
    
    if (fs.existsSync(servicePath)) {
      const success = migrateFile(servicePath);
      if (success) {
        results.success.push(serviceName);
      } else {
        results.failed.push(serviceName);
      }
    } else {
      console.log(`Service file not found: ${serviceName}`);
      results.failed.push(serviceName);
    }
  });
  
  // Print summary
  console.log('\n==== Migration Summary ====');
  console.log(`Total services: ${CRITICAL_SERVICES.length}`);
  console.log(`Successfully migrated: ${results.success.length}`);
  console.log(`Failed to migrate: ${results.failed.length}`);
  
  if (results.success.length > 0) {
    console.log('\nSuccessfully migrated services:');
    results.success.forEach(service => console.log(`- ${service}`));
  }
  
  if (results.failed.length > 0) {
    console.log('\nFailed to migrate services:');
    results.failed.forEach(service => console.log(`- ${service}`));
  }
}

// Main execution
function main() {
  // Check if the apply script exists
  if (!fs.existsSync(APPLY_SCRIPT)) {
    console.error(`Migration script not found: ${APPLY_SCRIPT}`);
    process.exit(1);
  }
  
  migrateCriticalServices();
}

main(); 