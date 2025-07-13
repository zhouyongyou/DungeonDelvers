# TypeScript `any` Type Finder and Fixer

This directory contains scripts to help identify and fix TypeScript `any` types in the DungeonDelvers codebase.

## Scripts Overview

### 1. `fix-typescript-any.mjs` - Comprehensive Analyzer
A full-featured TypeScript `any` type analyzer that:
- Scans all TypeScript files for explicit and implicit `any` types
- Categorizes findings by impact (high/medium/low)
- Suggests appropriate replacement types
- Generates detailed reports
- Provides automated fixes for simple cases

### 2. `quick-fix-any-patterns.mjs` - Pattern-Based Fixer
A targeted fixer that addresses common `any` patterns:
- Contract casting patterns
- Function name and args casting
- Map callback parameters
- Error catch blocks
- Array.from patterns
- Event handlers
- ESLint disable comments

## Usage

### Finding `any` Types

```bash
# Generate a comprehensive report of all `any` types
npm run ts:find-any

# This creates typescript-any-report.md with:
# - Summary by impact level
# - Detailed findings with line numbers
# - Suggested replacements
# - Auto-fixable indicators
```

### Quick Fixes

```bash
# See what would be fixed (dry run)
npm run ts:quick-fix:dry

# Apply common pattern fixes
npm run ts:quick-fix

# This will:
# - Remove unnecessary type assertions
# - Fix contract patterns
# - Add proper types to callbacks
# - Generate quick-fix-report.md
```

### Automated Fixes

```bash
# Preview automated fixes
npm run ts:fix-any:dry

# Apply automated fixes
npm run ts:fix-any:apply

# Generate a fix script
npm run ts:fix-any:script
```

## Common Patterns Found

### 1. Contract Patterns (High Impact)
```typescript
// Before
const hash = await writeContractAsync({ 
  ...(contractName as any), 
  functionName: 'methodName' as any,
  args: [arg1, arg2] as any 
});

// After
const hash = await writeContractAsync({ 
  address: contractName?.address as `0x${string}`,
  abi: contractName?.abi,
  functionName: 'methodName',
  args: [arg1, arg2]
});
```

### 2. Map Callbacks (High Impact)
```typescript
// Before
items.map((item: any) => item.id)
Array.from({ length: 5 }).map((_, i) => ...)

// After
items.map((item: { id: string }) => item.id)
Array.from({ length: 5 }).map((_: unknown, i: number) => ...)
```

### 3. Error Handling (Low Impact)
```typescript
// Before
} catch (e: any) {
  console.error(e.message);
}

// After
} catch (e) {
  console.error((e as Error).message);
}
```

### 4. Event Handlers (Medium Impact)
```typescript
// Before
await new Promise(resolve => setTimeout(resolve, 1000));

// After
await new Promise<void>(resolve => setTimeout(resolve, 1000));
```

## Fix Strategy

### Phase 1: Quick Fixes (Automated)
1. Run `npm run ts:quick-fix` to fix common patterns
2. Review changes with `git diff`
3. Run `npm run build` to check for errors
4. Commit changes

### Phase 2: Targeted Fixes (Semi-Automated)
1. Run `npm run ts:find-any` to generate report
2. Focus on HIGH impact findings
3. Use the automated fixer for simple cases
4. Manually fix complex cases

### Phase 3: Manual Review (Required)
1. Review remaining `any` types
2. Add proper type definitions
3. Consider creating shared types for common patterns
4. Update function signatures with proper types

## Best Practices

### Instead of `any`, use:
- `unknown` - When you don't know the type
- `Record<string, unknown>` - For objects
- `unknown[]` - For arrays
- Specific types - When you know the structure

### Type Guards
```typescript
// Use type guards for unknown types
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

try {
  // ...
} catch (error) {
  if (isError(error)) {
    console.error(error.message);
  }
}
```

### Contract Types
```typescript
// Create proper contract types
interface ContractCall {
  address: `0x${string}`;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
}
```

## Current Status

As of the last scan:
- **Total `any` types found**: 360
- **Explicit `any`**: 106
- **Implicit `any`**: 254
- **High impact**: 281
- **Medium impact**: 3
- **Low impact**: 76

## Files with Most `any` Types

1. `src/pages/MyAssetsPage.tsx` - 27 instances
2. `src/pages/DungeonPage.tsx` - 19 instances
3. `src/pages/VipPage.tsx` - 16 instances
4. `src/pages/ProvisionsPage.tsx` - 11 instances
5. `src/pages/AdminPage.tsx` - 9 instances

## Next Steps

1. **Run Quick Fix**: `npm run ts:quick-fix`
2. **Review Changes**: Check git diff and test functionality
3. **Run Full Analysis**: `npm run ts:find-any`
4. **Fix High Impact**: Focus on function parameters and return types
5. **Add Type Definitions**: Create shared types for common patterns
6. **Enable Strict Mode**: Consider enabling `noImplicitAny` in tsconfig

## Troubleshooting

### TypeScript Errors After Fixes
- Some fixes may require additional type imports
- Check if interfaces need to be defined
- Use `unknown` instead of `any` when unsure

### Contract Pattern Errors
- Ensure contract objects have proper type definitions
- Check that `address` and `abi` properties exist
- Verify function names match contract ABI

### Build Failures
- Run `npm run build` to see detailed errors
- Focus on one file at a time
- Use TypeScript's error messages to guide fixes

## Contributing

When adding new code:
1. Avoid using `any` types
2. Use proper type annotations
3. Define interfaces for complex objects
4. Use generic types where appropriate
5. Add JSDoc comments for complex types