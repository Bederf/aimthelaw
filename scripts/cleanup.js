#!/usr/bin/env node
/**
 * Frontend Cleanup Script
 * 
 * This script performs various cleanup operations for the frontend codebase:
 * 1. Moves temporary and backup files to appropriate directories
 * 2. Cleans up build artifacts
 * 3. Analyzes and reports on code organization
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMP_DIR = path.join(ROOT_DIR, 'tmp');
const BACKUPS_DIR = path.join(ROOT_DIR, 'backups');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');

// Files that should be moved to the backup directory
const BACKUP_PATTERNS = [
  '*.backup',
  '*.bak',
  'package.json.backup',
  'bun.lockb' // Only if using npm as primary package manager
];

// Files that should be moved to the docs directory
const DOCS_PATTERNS = [
  'README-*.md',
  '*-report.md',
  'unused-dependencies.txt'
];

// Files that should be deleted (build artifacts)
const DELETABLE_PATTERNS = [
  'dist/**/*.map'
];

// Ensure directories exist
[TEMP_DIR, BACKUPS_DIR, DOCS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Find files matching a pattern
function findFiles(pattern) {
  try {
    const output = execSync(`find ${ROOT_DIR} -maxdepth 1 -name "${pattern}" -type f`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    return [];
  }
}

// Move files matching patterns to a target directory
function moveFilesToDirectory(patterns, targetDir) {
  let movedCount = 0;
  
  patterns.forEach(pattern => {
    const files = findFiles(pattern);
    
    files.forEach(file => {
      const filename = path.basename(file);
      const targetPath = path.join(targetDir, filename);
      
      try {
        fs.copyFileSync(file, targetPath);
        fs.unlinkSync(file);
        console.log(`Moved ${filename} to ${targetDir}`);
        movedCount++;
      } catch (error) {
        console.error(`Error moving ${filename}: ${error.message}`);
      }
    });
  });
  
  return movedCount;
}

// Run a code organization check
function checkCodeOrganization() {
  console.log('\nCode Organization Check');
  console.log('======================');
  
  // Check for files that should be in specific directories
  const scriptsInRoot = findFiles('*.{js,ts}').filter(file => {
    const basename = path.basename(file);
    return !basename.match(/^(vite\.config|postcss\.config|tailwind\.config|eslint\.config)/);
  });
  
  if (scriptsInRoot.length) {
    console.log('\n⚠️ Script files that should be moved to /scripts:');
    scriptsInRoot.forEach(file => {
      console.log(`  - ${path.basename(file)}`);
    });
  }
  
  // Check for duplicate lock files (npm and yarn/bun)
  const hasPackageLock = fs.existsSync(path.join(ROOT_DIR, 'package-lock.json'));
  const hasYarnLock = fs.existsSync(path.join(ROOT_DIR, 'yarn.lock'));
  const hasBunLock = fs.existsSync(path.join(ROOT_DIR, 'bun.lockb'));
  
  if ([hasPackageLock, hasYarnLock, hasBunLock].filter(Boolean).length > 1) {
    console.log('\n⚠️ Multiple package manager lock files detected:');
    if (hasPackageLock) console.log('  - package-lock.json (npm)');
    if (hasYarnLock) console.log('  - yarn.lock (yarn)');
    if (hasBunLock) console.log('  - bun.lockb (bun)');
    console.log('  Consider standardizing on one package manager.');
  }
}

// Main execution
console.log('Frontend Cleanup Script');
console.log('======================');

// Move backup files
const backupsMoved = moveFilesToDirectory(BACKUP_PATTERNS, BACKUPS_DIR);
console.log(`\nBackup files moved: ${backupsMoved}`);

// Move documentation files
const docsMoved = moveFilesToDirectory(DOCS_PATTERNS, DOCS_DIR);
console.log(`Documentation files moved: ${docsMoved}`);

// Check code organization
checkCodeOrganization();

console.log('\nCleanup complete!');
console.log('Run this script periodically to maintain a clean frontend structure.'); 