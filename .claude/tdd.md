# AI Coding Assistant: Mandatory Test-Driven Development (TDD) Protocol

## Preamble
These are strict, non-negotiable coding instructions for any AI coding assistant. You MUST follow this TDD protocol at all times. Any violation requires immediate halt and human intervention.

## Core TDD Enforcement Principles
- **You MUST write tests before any implementation code.**
- **You MUST NOT write or modify implementation code unless a failing test exists.**
- **You MUST run the full test suite after every code change.**
- **You MUST NOT proceed to the next step unless all tests pass.**
- **If any test fails, you MUST return to the previous step and resolve the failure.**
- **You MUST work in small, testable increments.**

## Step-by-Step TDD Protocol

### 1. Test Writing Phase (Red)
- Analyze requirements and clarify acceptance criteria.
- Design and write automated tests for all expected behaviors, edge cases, and error scenarios.
- Ensure all new tests fail (verifying they detect the absence of functionality).
- Document test coverage and expectations.
- **You MUST NOT write or modify implementation code at this stage.**

### 2. Implementation Phase (Green)
- Review failing tests to understand requirements.
- Write the minimal implementation code necessary to make the failing tests pass.
- **You MUST NOT implement untested functionality.**
- Build and run the full test suite after coding.
- If any test fails, return to implementation and fix the code.
- Only proceed when all tests pass.

### 3. Refactoring Phase (Refactor)
- With all tests passing, review code for quality, duplication, and maintainability.
- Refactor code as needed, applying best practices and design patterns.
- After each refactor, build and run the full test suite.
- If any test fails, revert or fix the refactor until all tests pass.
- Only proceed when all tests pass.

### 4. Cycle Completion
- Confirm all requirements are met and all tests pass.
- Update documentation as needed.
- Plan the next increment and repeat the TDD cycle.

## Forbidden Actions
- You MUST NOT write or modify implementation code before writing a failing test.
- You MUST NOT skip the test-writing phase.
- You MUST NOT proceed to the next step if any test fails.
- You MUST NOT implement functionality not covered by a failing test.
- You MUST NOT ignore or suppress test failures.
- You MUST NOT skip running the full test suite after any code change.

## Enforcement and Checklists
At each step, you MUST:
- Explicitly check for the presence of failing tests before writing code.
- Explicitly check that all tests pass before proceeding to the next step.
- If any check fails, halt and return to the previous step.
- If unable to resolve a failure, halt and request human intervention.

## Metrics and Reporting
You MUST track and report the following metrics for each TDD cycle:
- Test Coverage
- Defect Rate
- Cycle Time
- Maintainability Index
- Regression Rate

## Consequences for Violations
If any rule in this protocol is violated:
- You MUST immediately halt all coding activity.
- You MUST notify the user and request human intervention.
- You MUST NOT attempt to proceed or self-correct outside this protocol.