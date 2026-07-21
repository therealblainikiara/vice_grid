```markdown
# vice_grid Development Patterns

> Auto-generated skill from repository analysis

## Overview
The `vice_grid` repository is a JavaScript codebase with no detected framework, focusing on modular and maintainable code. This skill teaches you the project's conventions for file naming, imports/exports, commit messages, and testing patterns, enabling you to contribute code that aligns with the established style.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `myComponent.js`, `gridUtils.js`

### Imports
- Use **relative import paths**.
  - Example:
    ```javascript
    import { calculateGrid } from './gridUtils';
    ```

### Exports
- Use **named exports**.
  - Example:
    ```javascript
    // gridUtils.js
    export function calculateGrid(params) { ... }
    ```

### Commit Messages
- **Freeform** style, no strict prefixes.
- Keep messages concise (average ~39 characters).
  - Example:  
    ```
    Add grid calculation utility
    ```

## Workflows

### Adding a New Module
**Trigger:** When you need to add new functionality as a separate module  
**Command:** `/add-module`

1. Create a new file using camelCase (e.g., `newFeature.js`).
2. Implement your logic using named exports.
    ```javascript
    // newFeature.js
    export function doSomething() { ... }
    ```
3. Import your module in other files using a relative path.
    ```javascript
    import { doSomething } from './newFeature';
    ```
4. Write a corresponding test file (see Testing Patterns).
5. Commit your changes with a concise message.

### Writing and Running Tests
**Trigger:** When you need to test new or existing functionality  
**Command:** `/run-tests`

1. Create a test file with the pattern `*.test.*` (e.g., `gridUtils.test.js`).
2. Write your test cases using the project's preferred (but currently unknown) testing framework.
3. Run your tests using the project's test runner (check project documentation or scripts).

### Refactoring Code
**Trigger:** When improving code structure or readability  
**Command:** `/refactor`

1. Update file and variable names to use camelCase.
2. Ensure all imports are relative.
3. Use named exports for all modules.
4. Update or add tests as needed.
5. Commit with a clear, concise message.

## Testing Patterns

- **File Naming:** Test files follow the `*.test.*` pattern (e.g., `myModule.test.js`).
- **Framework:** Not explicitly specified—review existing test files for framework clues.
- **Placement:** Test files are typically located alongside or near the modules they test.
- **Example:**
    ```javascript
    // gridUtils.test.js
    import { calculateGrid } from './gridUtils';

    test('calculates grid correctly', () => {
      // test logic here
    });
    ```

## Commands
| Command       | Purpose                                 |
|---------------|-----------------------------------------|
| /add-module   | Scaffold and add a new module           |
| /run-tests    | Run all test files                      |
| /refactor     | Refactor code to match conventions      |
```
