# Topic Research SOP

**Goal:** Identify high-value tax topics and create a structured content plan.
**Tools:** Tavily (Search), Claude (Analysis), Airtable (Source).

## 1. Topic Identification
- **Input:** `Topic` string from Airtable `Content_Specs`.
- **Process:**
  - **Tavily Search:** Query topic + "recent news Israel tax authorities 2024" or "IRS updates 2024".
  - **Context Gathering:** Aggregate snippets from top 5 search results.

## 2. Strategic Planning
- **Input:** Topic + Search Results.
- **Process:**
  - **Claude Prompt:** "Analyze these search results for topic '${topic}'. Identify the top 3 user questions/pain points. Create an outline for a comprehensive guide."
  - **Output Structure:** JSON with `title`, `outline` (headers), `keywords`, `target_audience`.

## 3. Plan Approval
- **Action:** Update Airtable record with the generated `Title`, `Outline`, and `Keywords`.
- **State Change:** Move Status to `Planned` (or skip directly to `Draft` if auto-pilot enabled).
