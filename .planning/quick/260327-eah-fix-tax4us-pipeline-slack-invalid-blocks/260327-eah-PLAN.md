---
phase: quick
plan: 260327-eah
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/clients/slack-client.ts
  - lib/pipeline/orchestrator.ts
autonomous: true
must_haves:
  truths:
    - "Slack social approval messages send without invalid_blocks error regardless of facebookPost length"
    - "Slack topic approval messages send without invalid_blocks error regardless of reasoning length"
    - "English WP post is created and published when publishApprovedArticle runs"
    - "Pipeline force=topic and force=publish complete without errors"
  artifacts:
    - path: "lib/clients/slack-client.ts"
      provides: "Truncated Slack block text fields to stay under 3000-char limit, button values under 2000-char limit"
    - path: "lib/pipeline/orchestrator.ts"
      provides: "Fixed publishApprovedArticle: no re-generation loop, no undefined title reference, English post created"
  key_links:
    - from: "lib/pipeline/orchestrator.ts"
      to: "lib/clients/slack-client.ts"
      via: "sendSocialApprovalRequest call in prepareSocialPosts"
      pattern: "sendSocialApprovalRequest"
---

<objective>
Fix 3 pipeline bugs preventing TAX4US content pipeline from completing: Slack invalid_blocks errors from oversized text, English post not being created, and undefined variable reference.

Purpose: Unblock the TAX4US content pipeline so force=topic and force=publish produce Hebrew post, English post, and Facebook post without errors.
Output: Fixed slack-client.ts and orchestrator.ts, verified via build.
</objective>

<execution_context>
@.planning/quick/260327-eah-fix-tax4us-pipeline-slack-invalid-blocks/260327-eah-PLAN.md
</execution_context>

<context>
@lib/clients/slack-client.ts
@lib/pipeline/orchestrator.ts
@lib/pipeline/social-publisher.ts
@app/api/cron/content-pipeline/route.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix Slack invalid_blocks — truncate text fields and button values</name>
  <files>lib/clients/slack-client.ts</files>
  <action>
  Three Slack API limits are being violated:

  1. **Block text field limit (3000 chars):** In `sendSocialApprovalRequest` (line ~199), `params.facebookPost` is embedded in a mrkdwn block inside triple backticks. If the post is over ~2900 chars, the block exceeds 3000. Fix: truncate `params.facebookPost` to 2900 chars before embedding, append "..." if truncated.

  2. **Button value limit (2000 chars):** In `sendSocialApprovalRequest` (line ~233), the "Approve & Post" button `value` includes `content: params.facebookPost` in JSON.stringify. This can easily exceed 2000 chars. Fix: remove `content` from the button value entirely — it is not needed for the approval handler (the handler can re-fetch content from the topic/post). Only keep `action`, `topicId`, `platforms`, `videoUrl`, `videoTaskId` in the button value.

  3. **Block text field limit in sendTopicApprovalRequest** (line ~279): The `reasoning` field could be long. Fix: truncate `params.reasoning` to 500 chars in the mrkdwn block.

  Add a private helper at the top of the class:
  ```typescript
  private truncate(text: string, maxLen: number): string {
      if (text.length <= maxLen) return text;
      return text.substring(0, maxLen - 3) + "...";
  }
  ```

  Apply truncation:
  - `sendSocialApprovalRequest`: truncate facebookPost to 2900 in the preview block, remove `content` from approve button value JSON
  - `sendTopicApprovalRequest`: truncate reasoning to 500 in the block text
  - `sendFacebookApprovalRequest`: truncate `params.content` to 2900 in the preview block, remove `content` from approve button value JSON (line ~551)
  - `sendLinkedInApprovalRequest`: truncate `params.content` to 2900 in the preview block, remove `content` from approve button value JSON (line ~639)
  </action>
  <verify>
    <automated>cd /Users/shaifriedman/superseller/TAX4US && npx tsc --noEmit lib/clients/slack-client.ts 2>&1 | head -20</automated>
  </verify>
  <done>All Slack message methods truncate text blocks to under 3000 chars and button values exclude full content strings. TypeScript compiles without errors.</done>
</task>

<task type="auto">
  <name>Task 2: Fix publishApprovedArticle — remove re-generation loop and fix undefined title</name>
  <files>lib/pipeline/orchestrator.ts</files>
  <action>
  Three issues in `publishApprovedArticle` (line 611+):

  **Issue A — Re-generation loop:** Line 621 calls `this.runFullGeneration(draftId, topicName)` which:
  (a) Regenerates content from scratch (wasteful — content already generated during the initial generatePost flow)
  (b) Sends ANOTHER `sendArticleApprovalRequest` (line 342), creating duplicate approval requests

  Fix: `publishApprovedArticle` should NOT call `runFullGeneration`. The draft already has Hebrew content from the previous generatePost call. Instead:
  - Skip the `runFullGeneration` call entirely (delete line 621)
  - The draft already has content from the initial `generatePost` -> `runFullGeneration` flow
  - Go straight to fetching the draft (line 624) which already has full Hebrew content + cover block

  **Issue B — Undefined `title` variable:** Lines 691-692 reference `title` which doesn't exist in `publishApprovedArticle` scope. The correct variable is `topicName`. Fix: replace `|| title` with `|| topicName` on lines 691 and 692.

  **Issue C — Double approval after runFullGeneration removal:** Since we're removing the `runFullGeneration` call, the draft content is whatever was saved during the original `generatePost` flow. The title still has `[AWAITING APPROVAL]` prefix from `runFullGeneration` line 324. The existing code at line 626 already strips this prefix, so that's fine.

  Summary of changes to `publishApprovedArticle`:
  1. DELETE line 621 (`await this.runFullGeneration(draftId, topicName);`)
  2. On line 691: change `|| title` to `|| topicName`
  3. On line 692: change `|| title` to `|| topicName`
  </action>
  <verify>
    <automated>cd /Users/shaifriedman/superseller/TAX4US && npx tsc --noEmit lib/pipeline/orchestrator.ts 2>&1 | head -30</automated>
  </verify>
  <done>publishApprovedArticle no longer re-generates content or sends duplicate approval. English post creation code is reached. No undefined variable references. TypeScript compiles clean.</done>
</task>

<task type="auto">
  <name>Task 3: Full build verification</name>
  <files>lib/clients/slack-client.ts, lib/pipeline/orchestrator.ts</files>
  <action>
  Run the full project build to confirm no regressions. Fix any type errors that surface.

  Commands:
  1. `npm run build` — full Next.js build including type checking
  2. If build fails, fix the specific errors and re-run

  Do NOT run the actual pipeline (force=topic or force=publish) — that is a manual step the user will do after deploying.
  </action>
  <verify>
    <automated>cd /Users/shaifriedman/superseller/TAX4US && npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>Full project builds successfully with zero type errors. Both fixed files compile and integrate correctly.</done>
</task>

</tasks>

<verification>
- `npm run build` passes with no errors
- slack-client.ts: all mrkdwn text blocks use truncated content (max 2900 chars)
- slack-client.ts: all button value JSON excludes large content fields
- orchestrator.ts: `publishApprovedArticle` does NOT call `runFullGeneration`
- orchestrator.ts: no reference to undefined `title` variable — uses `topicName` instead
</verification>

<success_criteria>
1. Project builds successfully (`npm run build` exits 0)
2. Slack messages will not exceed block text limits (3000 chars) or button value limits (2000 chars)
3. English post creation code in `publishApprovedArticle` is reachable (no prior throw from re-generation or Slack error)
4. No undefined variable references in the publish flow
</success_criteria>

<output>
After completion, create `.planning/quick/260327-eah-fix-tax4us-pipeline-slack-invalid-blocks/260327-eah-SUMMARY.md`
</output>
