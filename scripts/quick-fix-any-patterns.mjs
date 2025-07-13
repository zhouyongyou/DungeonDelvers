#!/usr/bin/env node

/**
 * Quick Fix for Common TypeScript Any Patterns
 * 
 * This script targets and fixes the most common patterns of `any` usage found in the codebase
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class QuickAnyFixer {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.fixCount = 0;
    this.files = new Set();
  }

  async fixCommonPatterns() {
    console.log('🔧 Starting quick fix for common TypeScript any patterns...\n');
    
    const files = await glob('**/*.{ts,tsx}', {
      cwd: path.join(this.projectRoot, 'src'),
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts']
    });

    for (const file of files) {
      await this.processFile(file);
    }

    console.log(`\n✅ Fixed ${this.fixCount} patterns in ${this.files.size} files`);
  }

  async processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // Fix pattern 1: Contract casting patterns
    content = this.fixContractCasting(content);
    
    // Fix pattern 2: Function name casting
    content = this.fixFunctionNameCasting(content);
    
    // Fix pattern 3: Args casting
    content = this.fixArgsCasting(content);
    
    // Fix pattern 4: Map callback parameters
    content = this.fixMapCallbacks(content);
    
    // Fix pattern 5: Error catches
    content = this.fixErrorCatches(content);
    
    // Fix pattern 6: Array.from patterns
    content = this.fixArrayFromPatterns(content);
    
    // Fix pattern 7: Event handlers
    content = this.fixEventHandlers(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      this.files.add(path.relative(this.projectRoot, filePath));
      
      // Count the number of fixes
      const originalAnyCount = (originalContent.match(/\bany\b/g) || []).length;
      const newAnyCount = (content.match(/\bany\b/g) || []).length;
      this.fixCount += originalAnyCount - newAnyCount;
    }
  }

  fixContractCasting(content) {
    // Pattern: (contractName as any) -> proper typing
    return content
      // Fix contract as any patterns
      .replace(/\((\w+Contract) as any\)/g, '$1')
      // Fix inline contract object patterns
      .replace(/\.\.\.\((\w+Contract) as any\),/g, (match, contractName) => {
        return `address: ${contractName}?.address as \`0x\${string}\`,\n        abi: ${contractName}?.abi,`;
      });
  }

  fixFunctionNameCasting(content) {
    // Pattern: functionName: 'methodName' as any -> remove as any
    return content.replace(/functionName:\s*'([^']+)'\s*as\s*any/g, "functionName: '$1'");
  }

  fixArgsCasting(content) {
    // Pattern: args: [...] as any -> remove as any
    return content.replace(/args:\s*\[(.*?)\]\s*as\s*any/g, 'args: [$1]');
  }

  fixMapCallbacks(content) {
    // Pattern: .map((item, index) => ...) - add proper types
    return content
      // Fix underscore patterns in map
      .replace(/\.map\(\((_+),\s*(\w+)\)\s*=>/g, '.map((_: unknown, $2: number) =>')
      // Fix single underscore patterns
      .replace(/\.map\(\((_)\)\s*=>/g, '.map((_: unknown) =>')
      // Fix named parameters without types
      .replace(/\.map\(\((\w+)\)\s*=>\s*\(/g, '.map(($1: unknown) => (')
      .replace(/\.map\(\((\w+),\s*(\w+)\)\s*=>\s*([^{])/g, '.map(($1: unknown, $2: number) => $3')
      // Fix attribute mapping patterns
      .replace(/attributes\?\.\map\(\((attr|trait):\s*any\)\s*=>/g, 'attributes?.map(($1: { trait_type: string; value: unknown }) =>')
      // Fix party mapping patterns
      .replace(/parties\.map\(\((p):\s*any\)\s*=>/g, 'parties.map(($1: { tokenId: string; [key: string]: unknown }) =>')
      // Fix hero/relic mapping patterns
      .replace(/\(p\.(heros|relics)\s*\|\|\s*\[\]\)\.map\(\((\w+):\s*any\)\s*=>/g, '(p.$1 || []).map(($2: { tokenId: string }) =>');
  }

  fixErrorCatches(content) {
    // Pattern: catch (e: any) -> catch (e: unknown) or catch (e)
    return content
      .replace(/catch\s*\((\w+):\s*any\)/g, 'catch ($1)')
      .replace(/catch\s*\(error\)\s*{/g, 'catch (error) {')
      .replace(/catch\s*\(e\)\s*{/g, 'catch (e) {');
  }

  fixArrayFromPatterns(content) {
    // Pattern: Array.from({ length: X }).map((_, i) => ...)
    return content
      .replace(/Array\.from\(\{\s*length:\s*(\w+)\s*\}\)\.map\(\((_+),\s*(\w+)\)\s*=>/g, 
        'Array.from({ length: $1 }).map((_: unknown, $3: number) =>');
  }

  fixEventHandlers(content) {
    // Pattern: resolve => setTimeout(resolve, X) -> proper typing
    return content
      .replace(/new Promise\(resolve\s*=>\s*setTimeout\(resolve,/g, 
        'new Promise<void>(resolve => setTimeout(resolve,')
      .replace(/new Promise\((resolve)\s*=>/g, 
        'new Promise<void>($1 =>');
  }

  generateReport() {
    const report = [
      '# Quick Fix Report',
      '',
      `Fixed ${this.fixCount} \`any\` patterns`,
      `Modified ${this.files.size} files`,
      '',
      '## Modified Files:',
      ...Array.from(this.files).map(f => `- ${f}`),
      '',
      '## Next Steps:',
      '1. Run `npm run build` to check for TypeScript errors',
      '2. Review the changes using `git diff`',
      '3. Run tests to ensure functionality is preserved',
      '4. Use the full analyzer for remaining `any` types',
      ''
    ];
    
    return report.join('\n');
  }
}

// Additional targeted fixes for specific patterns found in the codebase
class TargetedFixer {
  static fixContractPatterns(content) {
    // Fix the spread operator contract pattern
    const contractSpreadPattern = /\.\.\.\((\w+)\s+as\s+any\),\s*functionName:\s*'([^']+)'\s*as\s*any,?\s*(?:args:\s*\[(.*?)\]\s*as\s*any)?/g;
    
    content = content.replace(contractSpreadPattern, (match, contract, funcName, args) => {
      let result = `address: ${contract}?.address as \`0x\${string}\`,\n        abi: ${contract}?.abi,\n        functionName: '${funcName}'`;
      if (args) {
        result += `,\n        args: [${args}]`;
      }
      return result;
    });
    
    return content;
  }
  
  static fixEslintDisableComments(content) {
    // Remove eslint-disable comments for any
    return content
      .replace(/\/\*\s*eslint-disable\s+@typescript-eslint\/no-explicit-any\s*\*\/\n?/g, '')
      .replace(/\/\/\s*eslint-disable-next-line\s+@typescript-eslint\/no-explicit-any\n/g, '');
  }
  
  static fixValuePatterns(content) {
    // Fix value: X as any patterns
    return content.replace(/value:\s*(\w+)\s*as\s*any/g, 'value: $1');
  }
  
  static fixTypeAssertions(content) {
    // Fix getContract patterns
    return content.replace(/getContract\((\w+),\s*(\w+)\s*as\s*any\)/g, 'getContract($1, $2)');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  const projectRoot = path.resolve(__dirname, '..');
  const fixer = new QuickAnyFixer(projectRoot);
  
  try {
    if (dryRun) {
      console.log('🔍 Running in dry-run mode (no files will be modified)\n');
      
      // Just analyze and report
      const files = await glob('**/*.{ts,tsx}', {
        cwd: path.join(projectRoot, 'src'),
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts']
      });
      
      let totalAnyCount = 0;
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const anyCount = (content.match(/\bany\b/g) || []).length;
        if (anyCount > 0) {
          console.log(`${path.relative(projectRoot, file)}: ${anyCount} any types`);
          totalAnyCount += anyCount;
        }
      }
      
      console.log(`\nTotal: ${totalAnyCount} any types found`);
    } else {
      // Apply targeted fixes first
      console.log('📝 Applying targeted fixes...\n');
      
      const files = await glob('**/*.{ts,tsx}', {
        cwd: path.join(projectRoot, 'src'),
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts']
      });
      
      for (const file of files) {
        let content = fs.readFileSync(file, 'utf-8');
        const originalContent = content;
        
        // Apply all targeted fixes
        content = TargetedFixer.fixContractPatterns(content);
        content = TargetedFixer.fixEslintDisableComments(content);
        content = TargetedFixer.fixValuePatterns(content);
        content = TargetedFixer.fixTypeAssertions(content);
        
        if (content !== originalContent) {
          fs.writeFileSync(file, content);
        }
      }
      
      // Then apply common pattern fixes
      await fixer.fixCommonPatterns();
      
      // Generate report
      const report = fixer.generateReport();
      const reportPath = path.join(projectRoot, 'quick-fix-report.md');
      fs.writeFileSync(reportPath, report);
      
      console.log(`\n📄 Report saved to: ${reportPath}`);
      
      // Run TypeScript check
      console.log('\n🔍 Running TypeScript check...');
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      try {
        await execAsync('npx tsc --noEmit', { cwd: projectRoot });
        console.log('✅ TypeScript compilation successful!');
      } catch (error) {
        console.log('⚠️  TypeScript compilation has errors. Please review and fix manually.');
        console.log('Run `npm run build` to see detailed errors.');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();