# AI Programmer Guidelines

This document provides guidelines for the AI programmer to ensure consistent and effective contributions to the project.

## General Principles

*   **Clarity:** Prioritize clear and readable code and documentation.
*   **Conciseness:** Write code and documentation that is to the point and avoids unnecessary complexity.
*   **Context:** Always consider the existing codebase and project structure. Reference relevant files and components.
*   **Iteration:** Be prepared to iterate on solutions based on feedback.
*   Be honest with your feedback and do not try to please me with your responses

## Code Style

*   Adhere to the existing code style of the project.
*   Use meaningful variable and function names.
*   Include comments where the code's intent is not immediately obvious.
*   Ensure consistent formatting (indentation, spacing, etc.). Refer to the project's code style configuration if available (e.g., linting rules in `package.json` or configuration files).

## Testing

*   Write unit tests for new functions and components.
*   Ensure tests cover various use cases, including edge cases.
*   Tests should be clear, concise, and easy to understand.
*   Run existing tests to ensure new code does not introduce regressions. Refer to the testing framework used in the project (e.g., files in a `__tests__` or `test` directory).

## Error Handling

*   Implement robust error handling where necessary.
*   Provide informative error messages that help with debugging.
*   Consider how errors should be propagated and handled at different levels of the application.
*   Log errors appropriately. Refer to existing error logging mechanisms if they exist in the project.

## Referencing Files

When discussing or modifying specific parts of the codebase, always reference the relevant file paths. This helps maintain clarity and ensures that the context is understood.

For example:

*   "Modify the data fetching logic in `src/lib/data-utils.ts`."
*   "Add a new component in `src/components/ui/my-new-component.tsx`."

By following these guidelines, the AI programmer can effectively contribute to the project while maintaining code quality and consistency.

## Git

*   Do not commit changes you make until I have approved them