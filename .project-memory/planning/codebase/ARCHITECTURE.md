# Architecture

**Analysis Date:** 2026-03-23

## Pattern Overview

**Overall:** Multi-Worker Pipeline System with Event-Driven Processing

**Key Characteristics:**
- Worker-based content generation pipeline with approval gates
- Orchestrated multi-step workflows (9 distinct workers)
- Event-driven architecture with Slack-based human oversight
- Time-scheduled automation with manual override capabilities

## Layers

**API Layer:**
- Purpose: HTTP endpoints for pipeline control and data access
- Location: `app/api/`
- Contains: 47 route handlers with REST-style endpoints
- Depends on: Service layer, external integrations
- Used by: Frontend dashboard, cron jobs, webhooks

**Service Layer:**
- Purpose: Core business logic and external integrations
- Location: `lib/services/`
- Contains: Database abstraction, content generation, social media publishing
- Depends on: External APIs (WordPress, Slack, AI services)
- Used by: API routes, pipeline workers

**Pipeline Layer:**
- Purpose: Workflow orchestration and content processing
- Location: `lib/pipeline/`
- Contains: 9 specialized workers, orchestrator, logger
- Depends on: Service layer, client libraries
- Used by: Cron triggers, manual pipeline runs

**Client Layer:**
- Purpose: External service abstractions
- Location: `lib/clients/`
- Contains: WordPress, Slack, Claude, ElevenLabs, Captivate, Kie, Airtable clients
- Depends on: Environment variables, API credentials
- Used by: Services and pipeline workers

## Data Flow

**Content Creation Pipeline (Monday/Thursday):**

1. TopicManager proposes new topic using Claude AI
2. Slack approval gate with Ben (human oversight)
3. ContentGenerator creates Hebrew article via Claude
4. MediaProcessor generates images via Kie.ai
5. WordPress draft creation with SEO optimization
6. Second approval gate for content review
7. Translator creates English version
8. SocialPublisher prepares Facebook/LinkedIn posts
9. Final publication across all platforms

**State Management:**
- JSON file-based database in `data/` directory
- Pipeline runs tracked with status and stage progression
- Approval workflows stored with Slack message timestamps

## Key Abstractions

**PipelineOrchestrator:**
- Purpose: Central coordination of all workflow processes
- Examples: `lib/pipeline/orchestrator.ts`
- Pattern: Command pattern with async worker delegation

**WorkerResult Interface:**
- Purpose: Standardized worker output format
- Examples: `lib/types/pipeline.ts`
- Pattern: Result object with success/failure states

**Database Manager:**
- Purpose: JSON-based data persistence abstraction
- Examples: `lib/services/database.ts`
- Pattern: Repository pattern with CRUD operations

## Entry Points

**Cron Automation:**
- Location: `app/api/cron/content-pipeline/route.ts`
- Triggers: Vercel cron scheduler (daily at 8AM)
- Responsibilities: Initiates Monday/Thursday content creation

**Manual Pipeline:**
- Location: `app/api/pipeline/run/route.ts`
- Triggers: Dashboard UI or direct API calls
- Responsibilities: On-demand pipeline execution

**Slack Interactions:**
- Location: `app/api/slack/interactions/route.ts`
- Triggers: Slack button clicks and user responses
- Responsibilities: Approval processing and workflow continuation

## Error Handling

**Strategy:** Graceful degradation with comprehensive logging

**Patterns:**
- Try-catch blocks with specific error types
- Non-blocking media failures (continues without images)
- Slack notifications for critical failures
- Development mode bypasses for external API failures

## Cross-Cutting Concerns

**Logging:** Centralized pipeline logger with structured JSON output
**Validation:** TypeScript interfaces with runtime checks
**Authentication:** Multiple credential sources with environment variable fallbacks

---

*Architecture analysis: 2026-03-23*