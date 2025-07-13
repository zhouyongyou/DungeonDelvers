# Console Log Management Script

This script helps manage console statements in the DungeonDelvers project by:
- Finding all console.log, console.warn, console.error statements
- Removing debug logs that shouldn't be in production
- Converting necessary logs to use the proper logging system
- Creating a detailed report of all changes

## Usage

The script is available through npm commands:

### 1. Analyze Only (Default)
```bash
npm run console:analyze
```
This will scan all files and generate a report without making any changes.

### 2. Dry Run
```bash
npm run console:dry-run
```
This shows what changes would be made without actually modifying files.

### 3. Apply Changes
```bash
npm run console:apply
```
This will actually modify the source files. **Make sure to commit your changes first!**

## How It Works

The script follows these rules:

### Statements that are REMOVED:
- Debug logs (containing keywords like "debug", "test", "TODO", etc.)
- General console.log statements used for development
- Temporary logging statements

### Statements that are CONVERTED to logger:
- Error logs in catch blocks
- Production critical logs (containing keywords like "critical", "fatal", etc.)
- All console.error and console.warn statements
- Important operational logs

### Statements that are KEPT:
- Logs already wrapped in development environment checks
- Logs that are part of the logging system itself

## Report

After running any command, a detailed report is saved to:
```
console-log-report.md
```

The report includes:
- Summary of all console statements found
- Breakdown by type (log, warn, error, etc.)
- Detailed list of changes for each file
- Line numbers and original/replacement text

## Important Notes

1. **Backup First**: Always commit your changes or create a backup before running `console:apply`
2. **Review Changes**: Use `console:dry-run` first to review what will be changed
3. **Logger Import**: The script automatically adds logger imports where needed
4. **Path Resolution**: Import paths are calculated relative to each file's location

## Technical Details

- Target directory: `/src`
- File extensions: `.ts`, `.tsx`, `.js`, `.jsx`
- Excludes: node_modules, dist, build, test files, and the logger utility itself
- Uses the project's existing logger utility at `@/utils/logger`