# Coding Conventions

**Analysis Date:** 2026-03-23

## Naming Patterns

**Files:**
- kebab-case for all TypeScript files: `content-generator.ts`, `social-publisher.ts`
- Next.js route convention: `route.ts` in directory structure
- Test files: `.test.ts` or `.spec.ts` suffix

**Functions:**
- camelCase for methods and functions: `generateArticle()`, `sendSlackMessage()`
- Async functions consistently use `async` prefix mentally: `async createPost()`

**Variables:**
- camelCase for variables: `pipelineRun`, `contentPiece`
- SCREAMING_SNAKE_CASE for constants: `BEN_USER_ID`

**Types:**
- PascalCase for interfaces and types: `ContentMetadata`, `PipelineResult`
- Interface prefix pattern not used - direct naming

## Code Style

**Formatting:**
- Prettier configuration not explicitly defined
- Consistent indentation (2 spaces observed)
- Trailing semicolons used consistently

**Linting:**
- ESLint 9+ with Next.js configuration
- No custom rules observed beyond defaults

## Import Organization

**Order:**
1. External libraries (Next.js, React)
2. Internal utilities and types
3. Service layer imports
4. Client layer imports

**Path Aliases:**
- `@/` maps to root directory (configured in jest.config.js and tsconfig)

## Error Handling

**Patterns:**
- Try-catch blocks with specific error logging
- Graceful degradation (continues pipeline on non-critical failures)
- Error forwarding to Slack notifications
- Console.warn for missing configuration, console.error for failures

## Logging

**Framework:** Custom pipeline logger + console methods

**Patterns:**
- Structured logging with context: `pipelineLogger.info(message, contextId)`
- Level-based logging: info, warn, error, debug
- Development mode bypasses for external API failures

## Comments

**When to Comment:**
- Complex business logic in pipeline orchestration
- API integration quirks and workarounds
- Environment variable configuration requirements

**JSDoc/TSDoc:**
- Minimal usage - primarily interface documentation
- Function signatures rely on TypeScript for documentation

## Function Design

**Size:** Functions kept focused, largest orchestrator methods ~100 lines

**Parameters:** Interface objects preferred for complex parameter sets

**Return Values:** Consistent async/await pattern, structured result objects

## Module Design

**Exports:** Named exports preferred over default exports

**Barrel Files:** Not extensively used - direct imports from specific files

## TypeScript Usage

**Strictness:** High - extensive interface definitions for all data structures

**Type Safety:** 
- Explicit typing for API responses and database records
- Union types for status enums: `'draft' | 'published' | 'processing'`

**Generic Usage:** Limited - mostly concrete types for domain objects

---

*Convention analysis: 2026-03-23*