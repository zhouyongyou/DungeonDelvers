#!/usr/bin/env node

/**
 * TypeScript Any Type Finder and Fixer
 * 
 * This script finds all uses of `any` type in the codebase and provides:
 * 1. A detailed report of all findings
 * 2. Suggestions for proper types based on context
 * 3. Automated fixes where possible
 * 4. Prioritization based on impact
 */

import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class TypeScriptAnyFixer {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.findings = [];
    this.tsConfig = this.loadTsConfig();
  }

  loadTsConfig() {
    const configPath = ts.findConfigFile(
      this.projectRoot,
      ts.sys.fileExists,
      'tsconfig.json'
    );
    
    if (!configPath) {
      throw new Error('Could not find tsconfig.json');
    }

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    return ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(configPath)
    );
  }

  async scanProject() {
    console.log('🔍 Scanning for TypeScript files with `any` types...\n');
    
    const files = await glob('**/*.{ts,tsx}', {
      cwd: path.join(this.projectRoot, 'src'),
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts']
    });

    for (const file of files) {
      await this.analyzeFile(file);
    }

    console.log(`✅ Found ${this.findings.length} uses of \`any\` type\n`);
  }

  async analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const visit = (node) => {
      // Check for explicit any types
      if (node.kind === ts.SyntaxKind.AnyKeyword) {
        const location = this.getLocationInfo(sourceFile, node);
        const context = this.getContext(node);
        const suggestion = this.suggestType(node, sourceFile);
        
        this.findings.push({
          file: path.relative(this.projectRoot, filePath),
          line: location.line,
          column: location.column,
          code: location.code,
          context: context.type,
          suggestedType: suggestion.type,
          autoFixable: suggestion.autoFixable,
          impact: this.determineImpact(context),
          category: context.category
        });
      }

      // Check for implicit any in function parameters
      if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || 
          ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
        const parameters = node.parameters;
        parameters.forEach(param => {
          if (!param.type && !param.initializer) {
            const location = this.getLocationInfo(sourceFile, param);
            this.findings.push({
              file: path.relative(this.projectRoot, filePath),
              line: location.line,
              column: location.column,
              code: location.code,
              context: 'implicit-parameter',
              suggestedType: 'unknown',
              autoFixable: false,
              impact: 'high',
              category: 'function-parameter'
            });
          }
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  getLocationInfo(sourceFile, node) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const lineText = sourceFile.text.split('\n')[line];
    return {
      line: line + 1,
      column: character + 1,
      code: lineText.trim()
    };
  }

  getContext(node) {
    let parent = node.parent;
    
    while (parent) {
      if (ts.isParameter(parent)) {
        return { type: 'function-parameter', category: 'function' };
      }
      if (ts.isPropertyDeclaration(parent) || ts.isPropertySignature(parent)) {
        return { type: 'property-declaration', category: 'class/interface' };
      }
      if (ts.isVariableDeclaration(parent)) {
        return { type: 'variable-declaration', category: 'variable' };
      }
      if (ts.isTypeReferenceNode(parent) && parent.typeArguments) {
        return { type: 'generic-argument', category: 'generic' };
      }
      if (ts.isArrayTypeNode(parent)) {
        return { type: 'array-element', category: 'array' };
      }
      if (ts.isReturnStatement(parent)) {
        return { type: 'return-type', category: 'function' };
      }
      if (ts.isCatchClause(parent)) {
        return { type: 'catch-clause', category: 'error-handling' };
      }
      if (ts.isAsExpression(parent) || ts.isTypeAssertion(parent)) {
        return { type: 'type-assertion', category: 'type-assertion' };
      }
      parent = parent.parent;
    }
    
    return { type: 'unknown', category: 'other' };
  }

  suggestType(node, sourceFile) {
    const context = this.getContext(node);
    
    // Common patterns and their suggested types
    const suggestions = {
      'catch-clause': { type: 'unknown', autoFixable: true },
      'event-handler': { type: 'React.MouseEvent | React.KeyboardEvent', autoFixable: false },
      'array-element': { type: 'unknown[]', autoFixable: true },
      'api-response': { type: 'unknown', autoFixable: true },
      'error-type': { type: 'Error | unknown', autoFixable: true }
    };

    // Try to infer type from usage
    const parent = node.parent;
    
    // For function parameters, check how they're used in the function body
    if (ts.isParameter(parent)) {
      const usage = this.inferTypeFromUsage(parent, sourceFile);
      if (usage) {
        return { type: usage, autoFixable: false };
      }
    }

    // For variable declarations, check initialization
    if (ts.isVariableDeclaration(parent) && parent.initializer) {
      const inferredType = this.inferTypeFromExpression(parent.initializer);
      if (inferredType) {
        return { type: inferredType, autoFixable: true };
      }
    }

    // Default suggestions based on context
    return suggestions[context.type] || { type: 'unknown', autoFixable: true };
  }

  inferTypeFromUsage(param, sourceFile) {
    // This is a simplified version - a real implementation would need more sophisticated analysis
    const paramName = param.name.getText();
    const functionNode = param.parent;
    
    // Look for property accesses on the parameter
    const usages = [];
    
    const checkUsage = (node) => {
      if (ts.isPropertyAccessExpression(node) && 
          node.expression.getText() === paramName) {
        usages.push(node.name.text);
      }
      ts.forEachChild(node, checkUsage);
    };
    
    if (ts.isFunctionLike(functionNode) && functionNode.body) {
      checkUsage(functionNode.body);
    }
    
    // Common property patterns
    if (usages.includes('length')) return 'string | unknown[]';
    if (usages.includes('preventDefault')) return 'Event';
    if (usages.includes('target') && usages.includes('value')) return 'React.ChangeEvent<HTMLInputElement>';
    
    return null;
  }

  inferTypeFromExpression(expr) {
    if (ts.isStringLiteral(expr)) return 'string';
    if (ts.isNumericLiteral(expr)) return 'number';
    if (expr.kind === ts.SyntaxKind.TrueKeyword || 
        expr.kind === ts.SyntaxKind.FalseKeyword) return 'boolean';
    if (ts.isArrayLiteralExpression(expr)) return 'unknown[]';
    if (ts.isObjectLiteralExpression(expr)) return 'Record<string, unknown>';
    if (expr.kind === ts.SyntaxKind.NullKeyword) return 'null';
    if (expr.kind === ts.SyntaxKind.UndefinedKeyword) return 'undefined';
    
    return null;
  }

  determineImpact(context) {
    // High impact: public APIs, function parameters, return types
    if (['function-parameter', 'return-type', 'property-declaration'].includes(context.type)) {
      return 'high';
    }
    
    // Medium impact: internal variables, private properties
    if (['variable-declaration', 'generic-argument'].includes(context.type)) {
      return 'medium';
    }
    
    // Low impact: type assertions, catch clauses
    return 'low';
  }

  generateReport() {
    const report = [
      '# TypeScript `any` Type Analysis Report',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Total findings: ${this.findings.length}`,
      '',
      '## Summary by Impact',
      ''
    ];

    const byImpact = this.groupBy(this.findings, 'impact');
    
    for (const [impact, items] of Object.entries(byImpact)) {
      report.push(`### ${impact.toUpperCase()} Impact (${items.length} findings)`);
      report.push('');
      
      const byCategory = this.groupBy(items, 'category');
      for (const [category, categoryItems] of Object.entries(byCategory)) {
        report.push(`- **${category}**: ${categoryItems.length} findings`);
      }
      report.push('');
    }

    report.push('## Detailed Findings');
    report.push('');

    // Sort findings by impact and file
    const sortedFindings = [...this.findings].sort((a, b) => {
      const impactOrder = { high: 0, medium: 1, low: 2 };
      const impactDiff = impactOrder[a.impact] - impactOrder[b.impact];
      if (impactDiff !== 0) return impactDiff;
      return a.file.localeCompare(b.file);
    });

    let currentFile = '';
    for (const finding of sortedFindings) {
      if (finding.file !== currentFile) {
        currentFile = finding.file;
        report.push(`### ${finding.file}`);
        report.push('');
      }

      report.push(`**Line ${finding.line}** [${finding.impact} impact, ${finding.context}]`);
      report.push('```typescript');
      report.push(finding.code);
      report.push('```');
      
      if (finding.suggestedType) {
        report.push(`**Suggested type:** \`${finding.suggestedType}\``);
        report.push(`**Auto-fixable:** ${finding.autoFixable ? 'Yes ✅' : 'No ❌'}`);
      }
      
      report.push('');
    }

    return report.join('\n');
  }

  async applyAutomaticFixes(dryRun = true) {
    const results = [];
    const fixableFindings = this.findings.filter(f => f.autoFixable);
    
    console.log(`\n🔧 ${dryRun ? 'Preview of' : 'Applying'} automatic fixes...`);
    console.log(`Found ${fixableFindings.length} auto-fixable issues\n`);

    const fileGroups = this.groupBy(fixableFindings, 'file');
    
    for (const [file, findings] of Object.entries(fileGroups)) {
      const filePath = path.join(this.projectRoot, file);
      let content = fs.readFileSync(filePath, 'utf-8');
      const originalContent = content;
      
      // Sort findings by position (reverse order to avoid offset issues)
      const sortedFindings = findings.sort((a, b) => b.line - a.line || b.column - a.column);
      
      for (const finding of sortedFindings) {
        try {
          content = this.applyFix(content, finding);
        } catch (error) {
          results.push({
            file,
            original: originalContent,
            fixed: content,
            applied: false,
            error: error.message
          });
        }
      }
      
      if (!dryRun && content !== originalContent) {
        fs.writeFileSync(filePath, content);
      }
      
      results.push({
        file,
        original: originalContent,
        fixed: content,
        applied: !dryRun && content !== originalContent
      });
    }
    
    return results;
  }

  applyFix(content, finding) {
    const lines = content.split('\n');
    const lineIndex = finding.line - 1;
    
    if (lineIndex >= lines.length) {
      throw new Error('Line number out of bounds');
    }
    
    const line = lines[lineIndex];
    const regex = /\bany\b/g;
    
    // Simple replacement - in a real implementation, we'd use AST transformation
    lines[lineIndex] = line.replace(regex, (match, offset) => {
      // Check if this is the right `any` occurrence
      const columnMatch = offset === finding.column - 1 || 
                          (offset >= finding.column - 5 && offset <= finding.column + 5);
      
      if (columnMatch && finding.suggestedType) {
        return finding.suggestedType;
      }
      return match;
    });
    
    return lines.join('\n');
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const value = String(item[key]);
      (groups[value] = groups[value] || []).push(item);
      return groups;
    }, {});
  }

  async generateFixScript() {
    const scriptPath = path.join(this.projectRoot, 'scripts', 'apply-any-fixes.sh');
    const fixes = this.findings.filter(f => f.autoFixable);
    
    const script = [
      '#!/bin/bash',
      '',
      '# Auto-generated script to apply TypeScript any type fixes',
      `# Generated: ${new Date().toISOString()}`,
      `# Total fixes: ${fixes.length}`,
      '',
      'echo "🔧 Applying TypeScript any type fixes..."',
      '',
      '# Create backup',
      'cp -r src src.backup.$(date +%Y%m%d_%H%M%S)',
      '',
      '# Apply fixes',
      'node scripts/fix-typescript-any.mjs --apply',
      '',
      '# Run TypeScript compiler to check for errors',
      'echo "🔍 Checking TypeScript compilation..."',
      'npx tsc --noEmit',
      '',
      'if [ $? -eq 0 ]; then',
      '  echo "✅ All fixes applied successfully!"',
      '  echo "🧪 Running tests..."',
      '  npm test',
      'else',
      '  echo "❌ TypeScript compilation failed. Rolling back changes..."',
      '  rm -rf src',
      '  mv src.backup.* src',
      '  exit 1',
      'fi',
      ''
    ].join('\n');
    
    fs.writeFileSync(scriptPath, script);
    fs.chmodSync(scriptPath, '755');
    
    console.log(`✅ Generated fix script: ${scriptPath}`);
  }
}

// CLI Implementation
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  const generateScript = args.includes('--generate-script');
  
  const projectRoot = path.resolve(__dirname, '..');
  const fixer = new TypeScriptAnyFixer(projectRoot);
  
  try {
    // Scan the project
    await fixer.scanProject();
    
    // Generate and save report
    const report = fixer.generateReport();
    const reportPath = path.join(projectRoot, 'typescript-any-report.md');
    fs.writeFileSync(reportPath, report);
    console.log(`📄 Report saved to: ${reportPath}\n`);
    
    // Apply fixes if requested
    if (args.includes('--apply') || args.includes('--dry-run')) {
      const results = await fixer.applyAutomaticFixes(dryRun);
      
      console.log('\n📊 Fix Results:');
      for (const result of results) {
        if (result.error) {
          console.log(`❌ ${result.file}: ${result.error}`);
        } else if (result.applied) {
          console.log(`✅ ${result.file}: Fixed`);
        } else if (!dryRun) {
          console.log(`➖ ${result.file}: No changes needed`);
        }
      }
      
      if (dryRun) {
        console.log('\n💡 This was a dry run. Use --apply to apply fixes.');
      }
    }
    
    // Generate fix script if requested
    if (generateScript) {
      await fixer.generateFixScript();
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();