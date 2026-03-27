---
phase: quick
plan: 260327-eah
subsystem: pipeline
tags: [slack, pipeline, bugfix]
key-files:
  created: []
  modified:
    - lib/clients/slack-client.ts
    - lib/pipeline/orchestrator.ts
    - app/api/content-generation/route.ts
decisions:
  - "Used skipApproval option parameter on runFullGeneration instead of duplicating generation logic in publishApprovedArticle"
  - "Truncation limits: 2900 chars for mrkdwn blocks (under 3000 Slack limit), 500 chars for reasoning"
  - "Removed content from button values entirely rather than truncating (handler can re-fetch from DB)"
metrics:
  duration: "3m 38s"
  completed: "2026-03-27"
  tasks: 3
  files: 3
---

# Quick Task 260327-eah: Fix TAX4US Pipeline Slack Invalid Blocks

Truncate Slack block text fields and button values to prevent invalid_blocks API errors; fix publishApprovedArticle re-generation loop and undefined title variable.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `233168e` | Truncate Slack block text and button values to prevent invalid_blocks |
| 2 | `f41fe8e` | Fix publishApprovedArticle -- skip approval loop, fix undefined title |
| 3 | `a75a206` | Fix pre-existing build errors blocking verification |

## Changes Made

### Task 1: Slack invalid_blocks fix (slack-client.ts)
- Added `truncate()` helper method to SlackClient class
- `sendSocialApprovalRequest`: truncate facebookPost preview to 2900 chars, remove `content` from approve button value JSON
- `sendTopicApprovalRequest`: truncate reasoning to 500 chars in block text
- `sendFacebookApprovalRequest`: truncate content preview to 2900 chars, remove `content` from approve button value JSON
- `sendLinkedInApprovalRequest`: truncate content preview to 2900 chars, remove `content` from approve button value JSON

### Task 2: publishApprovedArticle fix (orchestrator.ts)
- Added `options?: { skipApproval?: boolean }` parameter to `runFullGeneration`
- When `skipApproval` is true, generation completes but does not send `sendArticleApprovalRequest` (prevents duplicate approval loop)
- `publishApprovedArticle` now calls `runFullGeneration(draftId, topicName, undefined, { skipApproval: true })`
- Fixed `|| title` (undefined variable) to `|| topicName` in English post SEO metadata (lines 697-698)

### Task 3: Build verification (pre-existing fixes)
- Removed duplicate `result` and `content` variable declarations in `content-generation/route.ts` (dead code from earlier refactor)
- Added `as any` type cast for `slug` property in `publishApprovedArticle` WP updatePost call

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing build errors in content-generation/route.ts**
- Found during: Task 3 (build verification)
- Issue: Duplicate variable declarations (`result`, `content`) from dead code left after a previous refactor
- Fix: Removed dead code block (mock response handling that duplicated inline generation)
- Files modified: app/api/content-generation/route.ts

**2. [Rule 3 - Blocking] Fixed pre-existing type error for slug property**
- Found during: Task 3 (build verification)
- Issue: `slug` property not in `Partial<WordPressPost>` type definition
- Fix: Added `as any` type cast (matches existing pattern used elsewhere in the file)
- Files modified: lib/pipeline/orchestrator.ts

**3. [Rule 2 - Approach change] Used skipApproval option instead of removing runFullGeneration call**
- Found during: Task 2 analysis
- Issue: Plan said to delete `runFullGeneration` call, but the draft only has topic JSON at approval time -- content generation IS needed, just not the approval step
- Fix: Added `skipApproval` option to `runFullGeneration` instead of removing the call entirely
- Files modified: lib/pipeline/orchestrator.ts

## Known Stubs

None -- all changes are functional fixes with no placeholder data.

## Self-Check: PASSED

- [x] lib/clients/slack-client.ts exists and contains truncation logic
- [x] lib/pipeline/orchestrator.ts exists and contains skipApproval parameter
- [x] Commit 233168e verified
- [x] Commit f41fe8e verified
- [x] Commit a75a206 verified
- [x] `npm run build` passes successfully
