#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Common unused imports patterns
const commonUnusedImports = [
  'Icons',
  'LoadingSpinner', 
  'ActionButton',
  'parseEther',
  'Address',
  'formatEther',
  'parseUnits',
  'getContract',
  'EmptyState',
  'usePagePerformance',
  'PerformanceDashboard',
  'usePagePreload',
  'getDomainBasedRoute',
  'redirectToDomainRoute'
];

// Run ESLint and capture output
console.log('Running ESLint to find unused imports...');
let lintOutput;
try {
  lintOutput = execSync('npm run lint', { encoding: 'utf8' });
} catch (error) {
  lintOutput = error.stdout + error.stderr;
}

// Find all unused import errors
const unusedImportPattern = /(.+):(\d+):\d+\s+error\s+'([^']+)' is defined but never used\s+@typescript-eslint\/no-unused-vars/g;
const errors = new Map();

let match;
while ((match = unusedImportPattern.exec(lintOutput)) !== null) {
  const filePath = match[1];
  const lineNum = parseInt(match[2]);
  const varName = match[3];
  
  if (commonUnusedImports.includes(varName)) {
    if (!errors.has(filePath)) {
      errors.set(filePath, []);
    }
    errors.get(filePath).push({ line: lineNum, variable: varName });
  }
}

console.log(`Found ${errors.size} files with common unused imports`);

// Process each file
let totalFixed = 0;
for (const [filePath, fileErrors] of errors) {
  if (!fs.existsSync(filePath)) continue;
  
  console.log(`\nProcessing ${path.basename(filePath)} (${fileErrors.length} unused imports)`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Sort by line number in reverse to avoid shifting
  fileErrors.sort((a, b) => b.line - a.line);
  
  fileErrors.forEach(({ line, variable }) => {
    const lineIndex = line - 1;
    const lineContent = lines[lineIndex];
    
    if (!lineContent || !lineContent.includes('import')) return;
    
    // Handle destructured imports
    if (lineContent.includes('{') && lineContent.includes('}')) {
      const importMatch = lineContent.match(/import\s*{([^}]+)}\s*from/);
      if (importMatch) {
        const imports = importMatch[1].split(',').map(i => i.trim());
        const filteredImports = imports.filter(i => {
          // Handle both "Name" and "Name as Alias" formats
          const importName = i.split(/\s+as\s+/)[0].trim();
          return importName !== variable;
        });
        
        if (filteredImports.length === 0) {
          // Comment out entire import
          lines[lineIndex] = '// ' + lineContent;
        } else {
          // Reconstruct import
          const newImport = lineContent.replace(
            /import\s*{[^}]+}\s*from/,
            `import { ${filteredImports.join(', ')} } from`
          );
          lines[lineIndex] = newImport;
        }
        totalFixed++;
      }
    } else if (lineContent.includes(`import ${variable}`)) {
      // Default import
      lines[lineIndex] = '// ' + lineContent;
      totalFixed++;
    }
  });
  
  // Write back
  fs.writeFileSync(filePath, lines.join('\n'));
}

console.log(`\nTotal fixed: ${totalFixed} common unused imports`);
console.log('\nNext steps:');
console.log('1. Run "npm run lint" again to check remaining errors');
console.log('2. Review changes with "git diff" to ensure correctness');
console.log('3. Some imports might be needed for side effects - restore if necessary');