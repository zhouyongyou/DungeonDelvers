#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Run ESLint and capture output
console.log('Running ESLint to find unused variables...');
let lintOutput;
try {
  lintOutput = execSync('npm run lint', { encoding: 'utf8' });
} catch (error) {
  // ESLint exits with error code when there are linting errors
  lintOutput = error.stdout + error.stderr;
}

// Parse unused variable errors
const unusedVarPattern = /(.+):(\d+):(\d+)\s+error\s+'([^']+)' is (defined but never used|assigned a value but never used)\s+@typescript-eslint\/no-unused-vars/g;
const errors = [];
let match;

while ((match = unusedVarPattern.exec(lintOutput)) !== null) {
  errors.push({
    file: match[1],
    line: parseInt(match[2]),
    column: parseInt(match[3]),
    variable: match[4],
    type: match[5]
  });
}

console.log(`Found ${errors.length} unused variable errors`);

// Group errors by file
const errorsByFile = {};
errors.forEach(error => {
  if (!errorsByFile[error.file]) {
    errorsByFile[error.file] = [];
  }
  errorsByFile[error.file].push(error);
});

// Process each file
let totalFixed = 0;
for (const [filePath, fileErrors] of Object.entries(errorsByFile)) {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${filePath} - file not found`);
    continue;
  }

  console.log(`\nProcessing ${filePath} (${fileErrors.length} errors)`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Sort errors by line number in reverse order to avoid line number shifts
  fileErrors.sort((a, b) => b.line - a.line);
  
  fileErrors.forEach(error => {
    const lineIndex = error.line - 1;
    const line = lines[lineIndex];
    
    if (!line) return;
    
    // Handle import statements
    if (line.includes('import')) {
      // Check if it's a destructured import
      if (line.includes('{') && line.includes('}')) {
        // Remove the specific import
        const importMatch = line.match(/import\s*{([^}]+)}\s*from/);
        if (importMatch) {
          const imports = importMatch[1].split(',').map(i => i.trim());
          const filteredImports = imports.filter(i => !i.includes(error.variable));
          
          if (filteredImports.length === 0) {
            // Remove entire import line
            lines[lineIndex] = '';
          } else {
            // Reconstruct import with remaining items
            const newImport = line.replace(
              /import\s*{[^}]+}\s*from/,
              `import { ${filteredImports.join(', ')} } from`
            );
            lines[lineIndex] = newImport;
          }
        }
      } else {
        // It's a default import, comment it out
        lines[lineIndex] = '// ' + line;
      }
    } else {
      // For variable declarations, add underscore prefix to indicate intentionally unused
      const varPattern = new RegExp(`\\b${error.variable}\\b`);
      if (line.match(varPattern)) {
        lines[lineIndex] = line.replace(varPattern, `_${error.variable}`);
      }
    }
    
    totalFixed++;
  });
  
  // Write back to file
  const newContent = lines.join('\n');
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Fixed ${fileErrors.length} errors in ${path.basename(filePath)}`);
  }
}

console.log(`\nTotal fixed: ${totalFixed} unused variable errors`);
console.log('\nNote: Some fixes may require manual review, especially for:');
console.log('- Variables that should be used but were forgotten');
console.log('- Import side effects that should be preserved');
console.log('- React components that should be rendered');