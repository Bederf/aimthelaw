#!/usr/bin/env node
/**
 * Script to help migrate console.log statements to the new logger
 * 
 * Usage:
 * node scripts/console-to-logger.js
 * 
 * This script will scan your source files for console.log statements and
 * generate suggestions for converting them to the new logger.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SRC_DIR = path.join(__dirname, '..', 'src');
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const EXCLUDED_DIRS = ['node_modules', 'dist', 'build'];

// Console methods to convert
const CONSOLE_METHODS = {
  'log': 'info',
  'info': 'info',
  'warn': 'warn',
  'error': 'error'
};

// The import statement to add
const LOGGER_IMPORT = "import { logger } from '@/utils/logger';";

// Helper function to extract the service name from file path
function getServiceName(filePath) {
  // Try to get a meaningful service name from the file path
  const relativePath = path.relative(SRC_DIR, filePath);
  const parts = relativePath.split(path.sep);
  
  // If it's in a feature directory, use that
  if (parts.length > 1) {
    return parts[0]; // e.g., 'auth', 'documents', etc.
  }
  
  // Default to file name without extension
  return path.basename(filePath, path.extname(filePath));
}

// Find all files with console.log statements
function findConsoleStatements() {
  try {
    // Use grep to find console statements across the codebase
    const command = `grep -r "console\\.(log\\|info\\|warn\\|error)" --include="*.ts" --include="*.tsx" ${SRC_DIR}`;
    const output = execSync(command, { encoding: 'utf8' });
    
    // Parse the output
    const results = {};
    
    output.split('\n').forEach(line => {
      if (!line) return;
      
      // Extract filename and match
      const match = line.match(/^([^:]+):(.+)$/);
      if (!match) return;
      
      const [_, filePath, content] = match;
      
      // Skip excluded directories
      if (EXCLUDED_DIRS.some(dir => filePath.includes(dir))) return;
      
      // Add to results
      if (!results[filePath]) {
        results[filePath] = [];
      }
      
      results[filePath].push(content.trim());
    });
    
    return results;
  } catch (error) {
    console.error('Error finding console statements:', error.message);
    return {};
  }
}

// Generate suggestions for converting console statements
function generateSuggestions(consoleStatements) {
  const suggestions = {};
  
  Object.entries(consoleStatements).forEach(([filePath, statements]) => {
    const serviceName = getServiceName(filePath);
    suggestions[filePath] = [];
    
    statements.forEach(statement => {
      // Try to extract the console method and message
      const consoleRegex = /console\.(log|info|warn|error)\((.+)\);?/;
      const match = statement.match(consoleRegex);
      
      if (!match) return;
      
      const [_, method, args] = match;
      const loggerMethod = CONSOLE_METHODS[method] || 'info';
      
      // Try to parse the arguments
      let suggestion;
      
      if (args.includes(',')) {
        // Multiple arguments
        const [firstArg, ...restArgs] = args.split(',');
        const message = firstArg.trim();
        const metadata = restArgs.join(',').trim();
        
        suggestion = `logger.${loggerMethod}(${message}, { service: '${serviceName}', metadata: ${metadata} });`;
      } else {
        // Single argument
        suggestion = `logger.${loggerMethod}(${args}, { service: '${serviceName}' });`;
      }
      
      suggestions[filePath].push({
        original: statement,
        suggestion
      });
    });
  });
  
  return suggestions;
}

// Main function
function main() {
  console.log('Scanning for console statements...');
  const consoleStatements = findConsoleStatements();
  const fileCount = Object.keys(consoleStatements).length;
  
  if (fileCount === 0) {
    console.log('No console statements found.');
    return;
  }
  
  console.log(`Found console statements in ${fileCount} files.`);
  
  // Generate suggestions
  const suggestions = generateSuggestions(consoleStatements);
  
  // Display suggestions
  Object.entries(suggestions).forEach(([filePath, fileSuggestions]) => {
    if (fileSuggestions.length === 0) return;
    
    console.log(`\n${filePath} (${fileSuggestions.length} statements):`);
    console.log(`Add import: ${LOGGER_IMPORT}\n`);
    
    fileSuggestions.forEach(({ original, suggestion }, index) => {
      console.log(`${index + 1}. Original: ${original}`);
      console.log(`   Replace with: ${suggestion}\n`);
    });
  });
  
  console.log('\nTo automatically apply these changes, you can build a more advanced script or use tools like jscodeshift.');
}

// Run the script
main(); 