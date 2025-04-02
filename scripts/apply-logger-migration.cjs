#!/usr/bin/env node
/**
 * Script to automatically apply the logger migration to a specific file
 * 
 * Usage:
 * node scripts/apply-logger-migration.cjs <file-path>
 * 
 * This script will replace console.log statements with logger calls
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.join(__dirname, '..', 'src');
const LOGGER_IMPORT = "import { logger } from '@/utils/logger';";

// Console methods to logger methods mapping
const METHOD_MAPPING = {
  'log': 'info',
  'info': 'info',
  'warn': 'warn',
  'error': 'error'
};

// Helper to extract service name from file path
function getServiceName(filePath) {
  const relativePath = path.relative(SRC_DIR, filePath);
  const parts = relativePath.split(path.sep);
  
  // If it's in a feature directory, use that
  if (parts.length > 1 && parts[0] === 'services') {
    const filename = path.basename(filePath, path.extname(filePath));
    return filename.replace(/Service$/, '').toLowerCase() + 'Service';
  }
  
  // If it's a component
  if (parts.length > 1 && parts[0] === 'components') {
    return 'components';
  }
  
  // If it's a page
  if (parts.length > 1 && parts[0] === 'pages') {
    return 'pages';
  }
  
  // Default to file name without extension
  return path.basename(filePath, path.extname(filePath)).toLowerCase();
}

// Helper to parse console.log statement and generate logger equivalent
function generateLoggerStatement(match, serviceName) {
  // Extract the console method
  const methodMatch = match.match(/console\.(log|info|warn|error)/);
  if (!methodMatch) return null;
  
  const consoleMethod = methodMatch[1];
  const loggerMethod = METHOD_MAPPING[consoleMethod] || 'info';
  
  // Try to extract the message and potential arguments
  let argsStart = match.indexOf('(') + 1;
  let argsEnd = match.lastIndexOf(')');
  let args = match.substring(argsStart, argsEnd).trim();
  
  // If no arguments, skip
  if (!args) return null;
  
  // Check if we have multiple arguments
  let hasMultipleArgs = false;
  let firstArg = args;
  let otherArgs = '';
  
  // Simple parsing to find the first comma outside of an object/array literal or string
  let openBrackets = 0;
  let inString = false;
  let escapeNext = false;
  let currentStringDelimiter = null;
  
  for (let i = 0; i < args.length; i++) {
    const char = args[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (inString) {
      if (char === '\\') {
        escapeNext = true;
      } else if (char === currentStringDelimiter) {
        inString = false;
        currentStringDelimiter = null;
      }
      continue;
    }
    
    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      currentStringDelimiter = char;
      continue;
    }
    
    if (char === '{' || char === '[') {
      openBrackets++;
    } else if (char === '}' || char === ']') {
      openBrackets--;
    } else if (char === ',' && openBrackets === 0) {
      hasMultipleArgs = true;
      firstArg = args.substring(0, i).trim();
      otherArgs = args.substring(i + 1).trim();
      break;
    }
  }
  
  // Generate the logger statement
  if (hasMultipleArgs) {
    // For error method with an error object
    if (loggerMethod === 'error' && otherArgs) {
      return `logger.error(${firstArg}, ${otherArgs}, { service: '${serviceName}' });`;
    }
    
    // For normal messages with additional data
    return `logger.${loggerMethod}(${firstArg}, { service: '${serviceName}', metadata: ${otherArgs} });`;
  } else {
    // Simple single argument
    return `logger.${loggerMethod}(${args}, { service: '${serviceName}' });`;
  }
}

// Process and migrate a file
function migrateFile(filePath) {
  console.log(`Migrating ${filePath}...`);
  
  // Read file content
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file ${filePath}: ${error.message}`);
    process.exit(1);
  }
  
  // Check if already using logger
  if (content.includes('logger.info') || 
      content.includes('logger.error') || 
      content.includes('logger.warn')) {
    console.log(`File ${filePath} already using logger, skipping.`);
    return;
  }
  
  // Extract service name
  const serviceName = getServiceName(filePath);
  console.log(`Using service name: ${serviceName}`);
  
  // Find all console.log statements
  const consoleRegex = /console\.(log|info|warn|error)\([^;]*\);?/g;
  const matches = content.match(consoleRegex);
  
  if (!matches || matches.length === 0) {
    console.log(`No console statements found in ${filePath}`);
    return;
  }
  
  console.log(`Found ${matches.length} console statements to migrate`);
  
  // Add logger import if needed
  if (!content.includes("import { logger } from '@/utils/logger'")) {
    // Find the last import statement
    const importLines = content.split('\n').filter(line => line.trim().startsWith('import '));
    if (importLines.length === 0) {
      // No imports found, add at the beginning
      content = `${LOGGER_IMPORT}\n\n${content}`;
    } else {
      // Add after the last import
      const lastImportIndex = content.lastIndexOf(importLines[importLines.length - 1]);
      const insertIndex = lastImportIndex + importLines[importLines.length - 1].length;
      content = content.substring(0, insertIndex) + 
                '\n' + LOGGER_IMPORT + 
                content.substring(insertIndex);
    }
    console.log('Added logger import');
  }
  
  // Replace each console statement with logger equivalent
  let modifiedContent = content;
  let replacementCount = 0;
  
  matches.forEach(match => {
    const loggerStatement = generateLoggerStatement(match, serviceName);
    if (loggerStatement) {
      modifiedContent = modifiedContent.replace(match, loggerStatement);
      replacementCount++;
    }
  });
  
  // Write the modified content back to the file
  try {
    fs.writeFileSync(filePath, modifiedContent, 'utf8');
    console.log(`Successfully migrated ${replacementCount} console statements to logger.`);
  } catch (error) {
    console.error(`Error writing file ${filePath}: ${error.message}`);
    process.exit(1);
  }
}

// Main execution
function main() {
  const targetFile = process.argv[2];
  
  if (!targetFile) {
    console.error('Please provide a file path to migrate');
    process.exit(1);
  }
  
  if (!fs.existsSync(targetFile)) {
    console.error(`File ${targetFile} doesn't exist.`);
    process.exit(1);
  }
  
  migrateFile(targetFile);
}

main(); 