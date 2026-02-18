---
name: tax4us-development
description: >-
  Manages Tax4US Content Factory development workflow with comprehensive progress tracking, 
  issue analysis, and systematic documentation. Use when developing Tax4US features, 
  debugging system issues, or tracking project progress. Not for other projects or 
  simple code fixes unrelated to Tax4US. Example: "Track the video generation bug fix 
  and document prevention strategies for the Tax4US project."
---

# Tax4US Content Factory Development Skill

## Critical
- **Always document issues with root cause analysis** - prevents recurring problems
- **Track all development decisions** - maintains project context across sessions
- **Validate integration points thoroughly** - Tax4US has complex external dependencies
- **Distinguish demo/production code clearly** - customer expects real functionality

## Core Workflow

### 1. Session Initialization
⛔ GATE: Session Start
Do NOT proceed until:
- [ ] Current session logged with timestamp and goals
- [ ] Previous session status reviewed
- [ ] Open issues identified and prioritized

```bash
scripts/init-session.sh --goals "specific session objectives"
```

### 2. Development Tracking
For each feature/fix:
1. **Log start** with context and approach
2. **Document decisions** made during implementation  
3. **Track issues** encountered with root causes
4. **Record solutions** and prevention strategies
5. **Test thoroughly** before marking complete

⛔ GATE: Feature Completion
Do NOT mark feature complete until:
- [ ] Functionality tested end-to-end
- [ ] Integration points validated
- [ ] No demo/placeholder code remains
- [ ] Documentation updated

### 3. Issue Management
When bugs occur:
1. **Immediate capture** - what, when, context
2. **Root cause analysis** - why did this happen?
3. **Solution implementation** - how was it fixed?
4. **Prevention strategy** - how to avoid recurrence?

Read `references/issue-analysis-framework.md` for systematic debugging approach.

### 4. Progress Reporting
Generate comprehensive status reports covering:
- Session accomplishments
- Current system state
- Open issues and blockers
- Next priorities
- Quality metrics

```bash
scripts/generate-status.sh --format comprehensive
```

## Integration Points

Tax4US has complex dependencies - validate these when making changes:
- **WordPress API** (tax4us.co.il content)
- **NotebookLM MCP** (AI content generation)
- **Kie.ai Sora-2-Pro** (video generation)
- **Apify services** (web scraping, analytics)
- **Social media APIs** (Facebook, LinkedIn)
- **Podcast platforms** (Captivate, Apple, Spotify)

When touching integration code, read `references/integration-validation.md` first.

## Quality Gates

### Before Customer Delivery
⛔ GATE: Production Readiness
- [ ] All APIs return real data (no mock/demo responses)
- [ ] UI shows actual generated content (no placeholder text)
- [ ] Buttons perform real actions (no broken links)
- [ ] Test suite passes 95%+ (run `scripts/comprehensive-test.sh`)
- [ ] Performance validated (load times, API response times)
- [ ] Error handling covers edge cases

### After Major Changes
⛔ GATE: Integration Health Check
- [ ] WordPress connection verified
- [ ] Content generation produces real output
- [ ] Video generation creates actual tasks
- [ ] Analytics display current data
- [ ] No console errors in browser

## Documentation Triggers

- **New feature implemented** → Update `references/feature-registry.md`
- **Bug discovered and fixed** → Add to `references/issue-prevention.md`
- **API integration added** → Document in `references/api-patterns.md`  
- **Performance issue resolved** → Record in `references/optimization-log.md`
- **Customer feedback received** → Log in `references/feedback-analysis.md`

## Error Prevention Patterns

Common Tax4US failure modes:
- **Demo vs Production Code** → Always validate real data flow
- **API Authentication Expiry** → Implement refresh mechanisms
- **Missing Error Handling** → Wrap all external API calls
- **Placeholder Content** → Use real data from actual APIs
- **Integration Timeouts** → Set appropriate timeout values

See `references/prevention-strategies.md` for detailed patterns.

## Session Documentation

Each development session must be logged with:
- **Timestamp and duration**
- **Goals set vs achieved** 
- **Issues encountered**
- **Decisions made**
- **Code changes summary**
- **Testing performed**
- **Next session priorities**

Use `scripts/log-session.sh` to maintain consistent format.