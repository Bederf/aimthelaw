#!/usr/bin/env node
/**
 * Script to migrate console.log statements to the new logger utility
 * 
 * Usage:
 * node scripts/migrate-logs.cjs [file-path]
 * 
 * If no file path is provided, it will scan the entire src directory
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SRC_DIR = path.join(__dirname, '..', 'src');
const EXCLUDED_DIRS = ['node_modules', 'dist', 'build'];
const EXTENSIONS = ['.ts', '.tsx'];

// Console methods to logger methods mapping
const METHOD_MAPPING = {
  'log': 'info',
  'info': 'info',
  'warn': 'warn',
  'error': 'error'
};

// The import statement to add
const LOGGER_IMPORT = "import { logger } from '@/utils/logger';";

// Helper to check if a file already imports the logger
function hasLoggerImport(content) {
  return content.includes("import { logger } from '@/utils/logger'");
}

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

// Process a single file
function processFile(filePath) {
  console.log(`Processing ${filePath}...`);
  
  // Read file content
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file ${filePath}: ${error.message}`);
    return;
  }
  
  // Check if already using logger
  if (content.includes('logger.info') || content.includes('logger.error') || content.includes('logger.warn')) {
    console.log(`File ${filePath} already using logger, skipping.`);
    return;
  }
  
  // Extract service name
  const serviceName = getServiceName(filePath);
  
  // Find all console.log statements
  const consoleRegex = /console\.(log|info|warn|error)\([^;]*\);?/g;
  const matches = content.match(consoleRegex);
  
  if (!matches || matches.length === 0) {
    console.log(`No console statements found in ${filePath}`);
    return;
  }
  
  console.log(`Found ${matches.length} console statements in ${filePath}`);
  
  // Generate logger statements for each match
  const replacements = [];
  matches.forEach(match => {
    const loggerStatement = generateLoggerStatement(match, serviceName);
    if (loggerStatement) {
      replacements.push({
        original: match,
        replacement: loggerStatement
      });
    }
  });
  
  // Output the suggested changes
  if (replacements.length > 0) {
    console.log(`\nSuggested changes for ${filePath}:`);
    
    // Check if we need to add the import
    if (!hasLoggerImport(content)) {
      console.log(`Add import: ${LOGGER_IMPORT}\n`);
    }
    
    replacements.forEach(({ original, replacement }, index) => {
      console.log(`${index + 1}. Replace:  ${original.trim()}`);
      console.log(`   With:      ${replacement}\n`);
    });
    
    console.log(`Total: ${replacements.length} replacements`);
  }
}

// Find files with console statements
function findFilesWithConsole(dir, targetFile = null) {
  if (targetFile) {
    // Process a specific file
    if (fs.existsSync(targetFile) && EXTENSIONS.includes(path.extname(targetFile))) {
      processFile(targetFile);
    } else {
      console.error(`File ${targetFile} doesn't exist or is not a TypeScript file.`);
    }
    return;
  }
  
  // Use grep to find files with console statements
  try {
    // Format the extensions pattern for grep
    const extensionsPattern = EXTENSIONS.map(ext => `*${ext}`).join(' --include=');
    const command = `grep -r "console\\.(log\\|info\\|warn\\|error)" --include=${extensionsPattern} ${dir}`;
    
    const output = execSync(command, { encoding: 'utf8' });
    
    // Process the grep output to get unique file paths
    const filePaths = new Set();
    output.split('\n').forEach(line => {
      if (!line) return;
      
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const filePath = line.substring(0, colonIndex);
        
        // Skip excluded directories
        if (!EXCLUDED_DIRS.some(excluded => filePath.includes(`/${excluded}/`))) {
          filePaths.add(filePath);
        }
      }
    });
    
    // Process each file
    filePaths.forEach(processFile);
    
    console.log(`\nProcessed ${filePaths.size} files with console statements.`);
  } catch (error) {
    if (error.status === 1) {
      // grep returns 1 when no matches found
      console.log('No files with console statements found.');
    } else {
      console.error(`Error finding files: ${error.message}`);
    }
  }
}

// Main execution
function main() {
  const targetFile = process.argv[2];
  findFilesWithConsole(SRC_DIR, targetFile);
}

main(); 