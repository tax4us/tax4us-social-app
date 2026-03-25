# Codebase Structure

**Analysis Date:** 2026-03-23

## Directory Layout

```
TAX4US/
├── app/                     # Next.js 16 App Router
│   ├── (dashboard)/         # Protected dashboard pages
│   ├── api/                 # API endpoints (47 routes)
│   └── linkedin-callback/   # OAuth callback page
├── lib/                     # Core business logic
│   ├── clients/            # External service wrappers
│   ├── services/           # Business logic layer
│   ├── pipeline/           # Worker system components
│   └── types/              # TypeScript definitions
├── components/             # React components
│   ├── ui/                # shadcn/ui components
│   └── dashboard/         # Dashboard-specific components
├── data/                  # JSON database files
├── __tests__/             # Test suites
└── .project-memory/       # Development tracking
```

## Directory Purposes

**app/api/:**
- Purpose: Next.js API routes for all backend functionality
- Contains: REST endpoints, cron handlers, webhook receivers
- Key files: `pipeline/run/route.ts`, `cron/content-pipeline/route.ts`

**lib/pipeline/:**
- Purpose: 9-worker content generation system
- Contains: Worker classes, orchestrator, logger
- Key files: `orchestrator.ts`, `content-generator.ts`, `social-publisher.ts`

**lib/services/:**
- Purpose: Business logic and data management
- Contains: Database layer, external integrations, utilities
- Key files: `database.ts`, `content-generation.ts`, `social-media-publisher.ts`

**lib/clients/:**
- Purpose: External API abstractions
- Contains: WordPress, Slack, AI service clients
- Key files: `wordpress-client.ts`, `slack-client.ts`, `claude-client.ts`

**data/:**
- Purpose: JSON-based database storage
- Contains: Content pieces, topics, approvals, pipeline runs
- Key files: `content_pieces.json`, `topics.json`, `pipeline_runs.json`

## Key File Locations

**Entry Points:**
- `app/api/pipeline/run/route.ts`: Manual pipeline execution
- `app/api/cron/content-pipeline/route.ts`: Automated daily runs
- `app/layout.tsx`: Root application layout

**Configuration:**
- `package.json`: Dependencies and scripts
- `jest.config.js`: Test configuration
- `vercel.json`: Deployment configuration

**Core Logic:**
- `lib/pipeline/orchestrator.ts`: Central workflow coordinator
- `lib/services/database.ts`: Data persistence layer
- `lib/types/pipeline.ts`: Type definitions

**Testing:**
- `__tests__/unit/`: Unit test suites
- `__tests__/integration/`: Integration tests
- `__tests__/e2e/`: End-to-end tests

## Naming Conventions

**Files:**
- kebab-case: `content-generator.ts`, `social-publisher.ts`
- Route files: `route.ts` in directory structure

**Directories:**
- kebab-case: `content-pipeline`, `social-media`
- Next.js conventions: `(dashboard)` for route groups

## Where to Add New Code

**New Pipeline Worker:**
- Primary code: `lib/pipeline/new-worker.ts`
- Tests: `__tests__/unit/new-worker.test.ts`

**New API Endpoint:**
- Implementation: `app/api/new-endpoint/route.ts`
- Tests: `__tests__/integration/new-endpoint.test.ts`

**New External Service:**
- Client: `lib/clients/service-client.ts`
- Service logic: `lib/services/service-integration.ts`

**Utilities:**
- Shared helpers: `lib/utils.ts`
- Type definitions: `lib/types/`

## Special Directories

**data/:**
- Purpose: JSON database files for development/production
- Generated: No, manually seeded and updated by application
- Committed: Yes, contains persistent application state

**.project-memory/:**
- Purpose: Claude Code session tracking and decisions
- Generated: Yes, by development tools
- Committed: Yes, provides development context

**__tests__/:**
- Purpose: Comprehensive test suites with mocks
- Generated: No, manually written
- Committed: Yes, ensures code quality

---

*Structure analysis: 2026-03-23*