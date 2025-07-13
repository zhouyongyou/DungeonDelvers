#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  targetDir: path.resolve(__dirname, '../src'),
  extensions: ['ts', 'tsx', 'js', 'jsx'],
  loggerImportPath: '@/utils/logger',
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.*',
    '**/*.spec.*',
    '**/utils/logger.ts' // Don't modify the logger itself
  ]
};

// Patterns to identify different types of console statements
const patterns = {
  debugLog: /console\.(log|debug)\s*\(\s*['"`].*?(debug|test|TODO|FIXME|temporary|remove).*?['"`]/i,
  errorLog: /console\.error\s*\(/,
  warnLog: /console\.warn\s*\(/,
  infoLog: /console\.(log|info)\s*\(/,
  developmentOnly: /if\s*\(\s*(process\.env\.NODE_ENV|import\.meta\.env\.DEV).*?\)\s*{?\s*console\./,
  tryCatch: /catch\s*\(.*?\)\s*{[^}]*console\.(error|warn)/,
  productionCritical: /console\.(error|warn)\s*\(\s*['"`].*?(critical|fatal|emergency|alert).*?['"`]/i
};

class ConsoleLogManager {
  constructor() {
    this.statements = [];
    this.filesModified = new Set();
  }

  async analyze() {
    console.log('🔍 Analyzing console statements in:', config.targetDir);
    
    const pattern = `**/*.{${config.extensions.join(',')}}`;
    const files = await glob(pattern, {
      cwd: config.targetDir,
      absolute: true,
      ignore: config.excludePatterns
    });

    console.log(`Found ${files.length} files to analyze`);

    for (const file of files) {
      await this.analyzeFile(file);
    }

    console.log(`\n📊 Analysis complete: Found ${this.statements.length} console statements`);
  }

  async analyzeFile(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const relPath = path.relative(process.cwd(), filePath);

    lines.forEach((line, index) => {
      const consoleMatch = line.match(/console\.(log|warn|error|debug|info|trace)\s*\(/);
      if (consoleMatch) {
        const type = consoleMatch[1];
        const statement = {
          file: relPath,
          line: index + 1,
          originalText: line.trim(),
          type,
          context: this.getContext(lines, index),
          action: this.determineAction(line, type, lines, index)
        };

        if (statement.action === 'convert') {
          statement.replacement = this.generateReplacement(line, type);
        }

        this.statements.push(statement);
      }
    });
  }

  getContext(lines, lineIndex) {
    // Get surrounding context (3 lines before and after)
    const start = Math.max(0, lineIndex - 3);
    const end = Math.min(lines.length - 1, lineIndex + 3);
    return lines.slice(start, end + 1).join('\n');
  }

  determineAction(line, type, lines, lineIndex) {
    // Keep error logs in catch blocks
    if (type === 'error' && this.isInCatchBlock(lines, lineIndex)) {
      return 'convert';
    }

    // Keep production critical logs
    if (patterns.productionCritical.test(line)) {
      return 'convert';
    }

    // Remove debug and test logs
    if (patterns.debugLog.test(line)) {
      return 'remove';
    }

    // Keep logs that are already wrapped in development checks
    if (this.isDevelopmentOnly(lines, lineIndex)) {
      return 'keep';
    }

    // Convert warnings and errors to logger
    if (type === 'error' || type === 'warn') {
      return 'convert';
    }

    // Remove other console.log statements
    if (type === 'log' || type === 'debug' || type === 'trace') {
      return 'remove';
    }

    return 'remove';
  }

  isInCatchBlock(lines, lineIndex) {
    // Look backwards for catch statement
    for (let i = lineIndex - 1; i >= Math.max(0, lineIndex - 10); i--) {
      if (/catch\s*\(/.test(lines[i])) {
        return true;
      }
      if (/^(function|class|const|let|var)\s/.test(lines[i].trim())) {
        break; // Stop if we hit a new declaration
      }
    }
    return false;
  }

  isDevelopmentOnly(lines, lineIndex) {
    // Check if the console statement is wrapped in a development check
    for (let i = lineIndex - 1; i >= Math.max(0, lineIndex - 5); i--) {
      if (patterns.developmentOnly.test(lines[i])) {
        return true;
      }
    }
    return false;
  }

  generateReplacement(line, type) {
    const indent = line.match(/^\s*/)?.[0] || '';
    const consoleRegex = new RegExp(`console\\.${type}\\s*\\(`);
    
    // Extract the arguments
    const startIndex = line.search(consoleRegex) + `console.${type}(`.length;
    let argString = '';
    let parenCount = 1;
    let inString = false;
    let stringChar = '';
    
    for (let i = startIndex; i < line.length && parenCount > 0; i++) {
      const char = line[i];
      
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && line[i - 1] !== '\\') {
        inString = false;
      }
      
      if (!inString) {
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
      }
      
      if (parenCount > 0) {
        argString += char;
      }
    }

    // Map console methods to logger methods
    const loggerMethod = type === 'log' ? 'info' : type;
    
    return `${indent}logger.${loggerMethod}(${argString});`;
  }

  async process(dryRun = true) {
    if (this.statements.length === 0) {
      console.log('No console statements to process');
      return;
    }

    console.log(`\n🔧 Processing ${this.statements.length} console statements (${dryRun ? 'DRY RUN' : 'APPLYING CHANGES'})`);

    // Group statements by file
    const fileGroups = new Map();
    this.statements.forEach(stmt => {
      if (!fileGroups.has(stmt.file)) {
        fileGroups.set(stmt.file, []);
      }
      fileGroups.get(stmt.file).push(stmt);
    });

    for (const [file, statements] of fileGroups) {
      await this.processFile(file, statements, dryRun);
    }

    if (!dryRun) {
      console.log(`\n✅ Modified ${this.filesModified.size} files`);
    }
  }

  async processFile(relPath, statements, dryRun) {
    const filePath = path.resolve(process.cwd(), relPath);
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    let modified = false;
    let needsLoggerImport = false;

    // Sort statements by line number in reverse order to process from bottom to top
    statements.sort((a, b) => b.line - a.line);

    statements.forEach(stmt => {
      const lineIndex = stmt.line - 1;
      
      if (stmt.action === 'remove') {
        lines[lineIndex] = ''; // Remove the line
        modified = true;
      } else if (stmt.action === 'convert' && stmt.replacement) {
        lines[lineIndex] = stmt.replacement;
        modified = true;
        needsLoggerImport = true;
      }
    });

    if (modified && !dryRun) {
      let newContent = lines.join('\n');
      
      // Add logger import if needed
      if (needsLoggerImport && !content.includes('logger')) {
        newContent = this.addLoggerImport(newContent, relPath);
      }
      
      // Clean up multiple empty lines
      newContent = newContent.replace(/\n\s*\n\s*\n/g, '\n\n');
      
      await fs.writeFile(filePath, newContent, 'utf-8');
      this.filesModified.add(relPath);
    }

    if (modified) {
      console.log(`\n📝 ${relPath}:`);
      statements.forEach(stmt => {
        const action = stmt.action === 'keep' ? '✓ KEEP' : 
                      stmt.action === 'remove' ? '❌ REMOVE' : 
                      '🔄 CONVERT';
        console.log(`  Line ${stmt.line}: ${action} - ${stmt.type}`);
        if (stmt.action === 'convert' && stmt.replacement) {
          console.log(`    → ${stmt.replacement.trim()}`);
        }
      });
    }
  }

  addLoggerImport(content, filePath) {
    const lines = content.split('\n');
    let importIndex = 0;
    
    // Find the last import statement
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        importIndex = i;
      } else if (lines[i].trim() && !lines[i].startsWith('//') && !lines[i].startsWith('/*')) {
        break;
      }
    }
    
    // Calculate relative import path
    const fromPath = path.dirname(filePath);
    const toPath = path.join(config.targetDir, 'utils/logger');
    let importPath = path.relative(fromPath, toPath);
    
    // Convert to forward slashes and add ./ if needed
    importPath = importPath.replace(/\\/g, '/');
    if (!importPath.startsWith('.')) {
      importPath = './' + importPath;
    }
    
    // Insert the import after the last import
    lines.splice(importIndex + 1, 0, `import { logger } from '${importPath}';`);
    
    return lines.join('\n');
  }

  generateReport() {
    const summary = {
      total: this.statements.length,
      byType: new Map(),
      byAction: new Map(),
      byFile: new Map()
    };

    this.statements.forEach(stmt => {
      // Count by type
      summary.byType.set(stmt.type, (summary.byType.get(stmt.type) || 0) + 1);
      
      // Count by action
      summary.byAction.set(stmt.action, (summary.byAction.get(stmt.action) || 0) + 1);
      
      // Count by file
      summary.byFile.set(stmt.file, (summary.byFile.get(stmt.file) || 0) + 1);
    });

    let report = '# Console Statement Management Report\n\n';
    report += `Generated on: ${new Date().toISOString()}\n\n`;
    
    report += '## Summary\n\n';
    report += `- Total console statements found: ${summary.total}\n`;
    report += `- Files affected: ${summary.byFile.size}\n`;
    report += `- Statements to remove: ${summary.byAction.get('remove') || 0}\n`;
    report += `- Statements to convert: ${summary.byAction.get('convert') || 0}\n`;
    report += `- Statements to keep: ${summary.byAction.get('keep') || 0}\n\n`;
    
    report += '## By Type\n\n';
    for (const [type, count] of summary.byType) {
      report += `- console.${type}: ${count}\n`;
    }
    
    report += '\n## By File\n\n';
    const sortedFiles = Array.from(summary.byFile.entries())
      .sort((a, b) => b[1] - a[1]);
    
    for (const [file, count] of sortedFiles) {
      report += `- ${file}: ${count} statements\n`;
    }
    
    report += '\n## Detailed Changes\n\n';
    const fileGroups = new Map();
    this.statements.forEach(stmt => {
      if (!fileGroups.has(stmt.file)) {
        fileGroups.set(stmt.file, []);
      }
      fileGroups.get(stmt.file).push(stmt);
    });
    
    for (const [file, statements] of fileGroups) {
      report += `### ${file}\n\n`;
      statements.sort((a, b) => a.line - b.line);
      
      statements.forEach(stmt => {
        report += `- Line ${stmt.line}: **${stmt.action.toUpperCase()}** \`console.${stmt.type}\`\n`;
        report += `  - Original: \`${stmt.originalText}\`\n`;
        if (stmt.replacement) {
          report += `  - Replacement: \`${stmt.replacement.trim()}\`\n`;
        }
      });
      report += '\n';
    }
    
    return report;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const manager = new ConsoleLogManager();
  
  console.log('🧹 Console Log Management Tool\n');
  
  try {
    if (command === 'analyze' || !command) {
      await manager.analyze();
      const report = manager.generateReport();
      const reportPath = path.join(process.cwd(), 'console-log-report.md');
      await fs.writeFile(reportPath, report, 'utf-8');
      console.log(`\n📄 Report saved to: ${reportPath}`);
    } else if (command === 'dry-run') {
      await manager.analyze();
      await manager.process(true);
      const report = manager.generateReport();
      const reportPath = path.join(process.cwd(), 'console-log-report.md');
      await fs.writeFile(reportPath, report, 'utf-8');
      console.log(`\n📄 Report saved to: ${reportPath}`);
    } else if (command === 'apply') {
      console.log('⚠️  This will modify your source files!');
      console.log('Make sure you have committed your changes or have a backup.\n');
      
      // Add a 3 second delay to allow user to cancel
      console.log('Starting in 3 seconds... (Press Ctrl+C to cancel)');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await manager.analyze();
      await manager.process(false);
      const report = manager.generateReport();
      const reportPath = path.join(process.cwd(), 'console-log-report.md');
      await fs.writeFile(reportPath, report, 'utf-8');
      console.log(`\n📄 Report saved to: ${reportPath}`);
    } else {
      console.log('Usage:');
      console.log('  node scripts/manage-console-logs.mjs          # Analyze only');
      console.log('  node scripts/manage-console-logs.mjs dry-run  # Show what would be changed');
      console.log('  node scripts/manage-console-logs.mjs apply    # Apply changes');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);