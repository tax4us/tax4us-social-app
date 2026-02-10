# Content Generation SOP

**Goal:** Draft a bilingual SEO-optimized article based on the approved plan.
**Tools:** Claude (Drafting), WordPress (Gutenberg Blocks).

## 1. Drafting (English First)
- **Input:** Approved Plan (Title, Outline, Keywords).
- **Process:**
  - **Claude Prompt:** "Write a detailed, authoritative blog post based on this outline. Use H2/H3 tags. Include a FAQ section."
  - **Constraint:** Ensure <1500 words for token efficiency unless topic demands deep dive.

## 2. Translation (Hebrew)
- **Input:** English Draft.
- **Process:**
  - call `Translator.translateHeToEn` (Wait, naming is confusing, logic is EN -> HE or HE -> EN depending on source. Let's assume EN source for now).
  - **Claude Prompt:** "Translate this to professional Hebrew. Maintain tone. Handle RTL formatting implicitly (text only)."

## 3. Gutenberg Assembly
- **Input:** English Text + Hebrew Text + Image URL.
- **Process:**
  - Convert Markdown/HTML to WordPress Block JSON structure.
  - Core Blocks: `core/paragraph`, `core/heading`, `core/image`, `core/list`.
  - **Polylang:** Link the two posts (HE default, EN translation).

## 4. SEO Scoring
- **Input:** Draft Content + Keyword.
- **Process:**
  - Basic analysis: Keyword density, Heading structure, Length.
  - Return Score (0-100).
- **Optimization:** If score < 70, ask Claude to "Optimize this text for keyword X".
