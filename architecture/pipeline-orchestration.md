# Pipeline Orchestration SOP

**Goal:** Coordinate the lifecycle of a topic from "Ready" to "Published" across all channels.
**State Machine:** Managed via Airtable `Content_Specs` `Status` field.

## State Transitions

### 1. Ready -> Review
- **Trigger:** `PipelineOrchestrator.runPipelineForTopic(id)`
- **Input:** Topic ID where `Status = 'Ready'`
- **Actions:**
  1. Call `TopicManager.researchAndPlan(topic)` -> returns Plan
  2. Call `ContentGenerator.generateArticle(plan)` -> returns Article (HTML + Metadata)
  3. Call `MediaProcessor.generateAndUploadImage(prompt)` -> returns ImageURL
  4. Inject ImageURL into Article Content.
  5. Update Airtable:
     - `Status` -> "Review"
     - `Generated Content` -> Article HTML
     - `Featured Image URL` -> ImageURL
     - `SEO Score` -> Score

### 2. Review -> Published (Manual Approval)
- **Trigger:** Human reviews content in Airtable/Dashboard and changes `Status` to "Safe to Publish" (or similar trigger). 
- **System Action:** `PipelineOrchestrator.publishApproved(id)`
- **Actions:**
  1. Read `Generated Content` from Airtable.
  2. Call `WordPressClient.createPost(...)`.
  3. Update Airtable:
     - `Status` -> "Published"
     - `URL` -> WordPress Link

### 3. Published -> Repurposed (Post-Publish Automation)
- **Trigger:** `PipelineOrchestrator.runRepurposing(id)` (Called immediately after publish)
- **Actions:**
  1. **Social:**
     - Call `SocialPublisher.generateSocialContent(content, title)`
     - Call `SocialPublisher.publishToAll(...)` (or queue in Airtable)
  2. **Podcast:**
     - Call `PodcastProducer.produceFromArticle(content, title)`
     - Call `CaptivateClient.uploadEpisode(...)`
  3. Update Airtable:
     - Log social links or status.

## Error Handling
- logic: If any step fails, update Airtable `Status` to "Error" and log the error message in a `Error Logs` field.
