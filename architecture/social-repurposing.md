# Social Repurposing SOP

**Goal:** Transform long-form tax articles into engaging, platform-native social media posts.
**Tools:** Claude 3.5 Sonnet (Generation), LinkedIn/Facebook APIs (Distribution).

## LinkedIn Strategy
- **Audience:** Professionals, Business Owners, High Net Worth Individual.
- **Tone:** Authoritative, Insightful, Professional.
- **Structure:**
  - **Hook:** A surprising tax fact or common misconception.
  - **Body:** 3-4 bullet points summarizing key takeaways from the article.
  - **CTA:** "Read the full guide to save on your taxes here: [Link]"
- **Length:** 150-250 words.
- **Formatting:** extensive use of line breaks, emojis (📉, 💰, 🏛️) but not overused.

## Facebook Strategy
- **Audience:** General public, Small Business Owners, Families.
- **Tone:** Helpful, Friendly, Urgent (if deadline related).
- **Structure:**
  - **Question:** "Did you know you might be paying too much for X?"
  - **Body:** Brief explanation of the benefit/solution.
  - **CTA:** "Check out our latest guide: [Link]"
- **Length:** 80-150 words.

## Generation Logic
1. **Input:** Full Article HTML (strip tags to plain text first).
2. **Process:**
   - Send to Claude with separate prompts for LinkedIn and Facebook.
   - Validate output is not empty.
3. **Output:** Dictionary `{ linkedin: string, facebook: string }`.

## Publishing Logic
- **Mock Implementation (Phase 1):** Return "Queued" status.
- **Real Implementation (Phase 2):** Use `UPLOAD_POST_TOKEN` to hit the social automation webhook (n8n or proprietary).
