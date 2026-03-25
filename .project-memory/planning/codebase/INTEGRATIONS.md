# External Integrations

**Analysis Date:** 2026-03-23

## APIs & External Services

**Content Management:**
- WordPress - Content publishing and management
  - SDK/Client: Custom REST API client in `lib/clients/wordpress-client.ts`
  - Auth: WORDPRESS_APP_USERNAME, WORDPRESS_APP_PASSWORD

**AI & Content Generation:**
- Claude (Anthropic) - Article generation and content enhancement
  - SDK/Client: Custom client in `lib/clients/claude-client.ts`
  - Auth: CLAUDE_API_KEY

- Kie.ai - Image and video generation
  - SDK/Client: Custom client in `lib/clients/kie-client.ts`
  - Auth: KIE_API_KEY

- ElevenLabs - Text-to-speech for podcast production
  - SDK/Client: Custom client in `lib/clients/elevenlabs-client.ts`
  - Auth: ELEVENLABS_API_KEY

**Communication:**
- Slack - Approval workflows and notifications
  - SDK/Client: Custom client in `lib/clients/slack-client.ts`
  - Auth: SLACK_BOT_TOKEN

**Content Distribution:**
- Captivate - Podcast hosting and distribution
  - SDK/Client: Custom client in `lib/clients/captivate-client.ts`
  - Auth: CAPTIVATE_API_KEY, CAPTIVATE_USER_ID

## Data Storage

**Databases:**
- JSON File System - Primary data storage
  - Connection: Local filesystem (`data/` directory)
  - Client: Custom DatabaseManager in `lib/services/database.ts`

**File Storage:**
- Local filesystem for development
- External URLs for media assets (Kie.ai, WordPress uploads)

**Caching:**
- None - Direct API calls with error handling

## Authentication & Identity

**Auth Provider:**
- Custom - Multiple credential management systems
  - Implementation: Environment variable-based authentication per service

**Social Media OAuth:**
- LinkedIn - Programmatic posting capability
  - Implementation: Custom OAuth flow in `lib/services/linkedin-oauth.ts`

## Monitoring & Observability

**Error Tracking:**
- Slack notifications for critical failures
- Console logging with structured output

**Logs:**
- Centralized pipeline logger in `lib/pipeline/logger.ts`
- JSON-structured logging for pipeline operations

## CI/CD & Deployment

**Hosting:**
- Vercel - Serverless deployment platform

**CI Pipeline:**
- Vercel automatic deployments
- GitHub integration for continuous deployment

## Environment Configuration

**Required env vars:**
- WORDPRESS_API_URL, WORDPRESS_APP_USERNAME, WORDPRESS_APP_PASSWORD
- CLAUDE_API_KEY, KIE_API_KEY, ELEVENLABS_API_KEY
- SLACK_BOT_TOKEN, CAPTIVATE_API_KEY, CAPTIVATE_USER_ID
- CRON_SECRET (for secured cron endpoints)

**Secrets location:**
- Environment variables via Vercel dashboard
- Local development: .env.local

## Webhooks & Callbacks

**Incoming:**
- Slack interactions: `app/api/slack/interactions/route.ts`
- LinkedIn OAuth callback: `app/linkedin-callback/page.tsx`

**Outgoing:**
- WordPress post publication
- Slack approval requests and notifications
- Social media posting (Facebook, LinkedIn)

## Content Pipeline Dependencies

**Required for Full Operation:**
- WordPress (content management)
- Claude AI (content generation)
- Slack (human approval gates)
- Kie.ai (media generation)

**Optional Services:**
- ElevenLabs (podcast audio)
- Captivate (podcast distribution)
- LinkedIn (social posting)

---

*Integration audit: 2026-03-23*