# Testing Patterns

**Analysis Date:** 2026-03-23

## Test Framework

**Runner:**
- Jest 30.2.0
- Config: `jest.config.js`

**Assertion Library:**
- @jest/globals 30.2.0
- Built-in Jest assertions

**Run Commands:**
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
npm run test:ci       # CI mode (no watch)
```

## Test File Organization

**Location:**
- Separate `__tests__/` directory structure

**Naming:**
- `.test.ts` suffix consistently used
- Mirror source file structure: `unit/`, `integration/`, `e2e/`, `comprehensive/`

**Structure:**
```
__tests__/
├── unit/                    # Unit tests
├── integration/             # API integration tests  
├── e2e/                     # End-to-end workflow tests
├── comprehensive/           # Production scenario tests
└── mocks/                   # Mock implementations
```

## Test Structure

**Suite Organization:**
```typescript
describe('ServiceName', () => {
  beforeEach(() => {
    // Setup per test
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Test implementation
    });

    it('should handle error case', async () => {
      // Error scenario
    });
  });
});
```

**Patterns:**
- Async/await pattern for all asynchronous tests
- Descriptive test names following "should do X when Y" format
- Setup and teardown in beforeEach/afterEach hooks

## Mocking

**Framework:** Jest built-in mocking capabilities

**Patterns:**
```typescript
// Service mocking
jest.mock('../lib/services/content-generation', () => ({
  generateContent: jest.fn()
}));

// External API mocking
const mockFetch = jest.fn();
global.fetch = mockFetch;
```

**What to Mock:**
- External API calls (WordPress, Claude, Slack)
- File system operations in production
- Environment variable dependencies

**What NOT to Mock:**
- Internal business logic
- TypeScript interfaces and types
- Simple utility functions

## Fixtures and Factories

**Test Data:**
```typescript
// Mock data in __tests__/mocks/
export const mockContentPiece = {
  id: 'test-content-123',
  topic_id: 'test-topic-456',
  status: 'draft' as const,
  // ... structured test data
};
```

**Location:**
- `__tests__/mocks/` directory for reusable fixtures
- Inline factories for test-specific data

## Coverage

**Requirements:** Coverage collection configured but no enforced thresholds

**View Coverage:**
```bash
npm run test:coverage
```

**Collection Areas:**
- `lib/**/*.{js,ts}` - Core business logic
- `app/api/**/*.{js,ts}` - API endpoints
- Excludes: `*.d.ts`, config files, node_modules

## Test Types

**Unit Tests:**
- Individual service and client testing
- Mock external dependencies
- Focus on business logic correctness

**Integration Tests:**
- API endpoint testing with real database operations
- Pipeline component interaction testing
- External service integration (with mocking)

**E2E Tests:**
- Full pipeline workflow testing
- Worker automation scenarios
- End-to-end content generation flows

**Comprehensive Tests:**
- Production scenario simulation
- Performance and reliability testing
- Cross-platform compatibility

## Common Patterns

**Async Testing:**
```typescript
it('should process pipeline successfully', async () => {
  const result = await orchestrator.runPipeline();
  expect(result.success).toBe(true);
});
```

**Error Testing:**
```typescript
it('should handle API failures gracefully', async () => {
  mockApiCall.mockRejectedValue(new Error('API Error'));
  await expect(service.process()).rejects.toThrow('API Error');
});
```

**Mock Verification:**
```typescript
it('should call external service with correct parameters', async () => {
  await service.process();
  expect(mockExternalCall).toHaveBeenCalledWith(expectedParams);
});
```

---

*Testing analysis: 2026-03-23*