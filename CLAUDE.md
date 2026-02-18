# TAX4US CLAUDE CODE PROJECT STRUCTURE

## STRICT FOLDER ORGANIZATION

### `/app/` - Next.js App Router
- `/(dashboard)/` - Protected dashboard pages ONLY
- `/api/` - API endpoints ONLY (no business logic)
- `layout.tsx`, `page.tsx` - Route handlers

### `/lib/` - Core Business Logic
- `/services/` - External integrations (WordPress, Slack, etc.)
- `/pipeline-data.ts` - Data fetching utilities
- `/utils.ts` - Pure utility functions

### `/components/` - React Components
- `/ui/` - Reusable UI components (shadcn/ui)
- Dashboard-specific components at root level

### `/data/` - Static Data & Schemas
- JSON fixtures, type definitions, constants

### `/.project-memory/` - Development Tracking (CODEBASE ONLY)
- `sessions.json` - Claude work sessions
- `tasks.json` - Task progress tracking
- `decisions.json` - Technical decisions
- `system_state.json` - API/deployment status

## CLAUDE SKILLS USAGE MATRIX

### MUST USE for every session:
1. **TodoWrite** - Track ALL multi-step tasks immediately
2. **Read before Edit** - Always read file before modifying  
3. **Parallel tool calls** - Batch independent operations for speed
4. **Error investigation** - Never ignore console errors, investigate root causes
5. **Change documentation** - Log every decision in `.project-memory/decisions.json`
6. **Systematic testing** - Fix broken functionality, don't just report it
7. **Project structure adherence** - Follow strict folder organization

### WHEN TO USE EACH TOOL:
- **Task Agent**: Multi-round searches, complex research, when uncertain about search scope
- **Grep**: Code pattern searches within known files/scope  
- **Glob**: File pattern matching by name/extension
- **Read**: Specific file paths, understanding before editing
- **WebSearch**: Current info beyond knowledge cutoff
- **NotebookLM MCP**: Content research, brand assets, templates, customer insights
- **Bash**: System operations, git commands, npm scripts
- **Edit/MultiEdit**: File modifications after reading
- **Write**: New file creation (avoid unless necessary)

### DEVELOPMENT COMMANDS:
- **Build**: `npm run build`
- **Lint**: `npm run lint` 
- **TypeCheck**: `npm run type-check`
- **Test**: `npm test`

## CHANGE DOCUMENTATION SYSTEM

### REQUIRED: Document in `.project-memory/decisions.json` after EVERY change:
```json
{
  "id": "decision_timestamp",
  "decision": "What was changed",
  "context": "Why it was needed", 
  "alternatives_considered": ["Other options"],
  "reasoning": "Why this approach",
  "implementation_notes": "Technical details",
  "impact": "low|medium|high",
  "made_at": "ISO timestamp",
  "made_by": "Claude Sonnet 4"
}
```

### SESSION TRACKING RULES:
1. **Start**: Log session with specific goals
2. **During**: Update task progress in real-time  
3. **End**: Complete session with achievements/challenges
4. **Learn**: Document what caused issues and prevention

## CONTENT VS CODE SEPARATION

### NOTEBOOKLM NOTEBOOKS (Content/Research):
- Brand assets, logos, Hebrew content
- Market research and competitive analysis
- Content templates and writing guidelines
- Customer persona and messaging strategy

### CODEBASE (Technical Implementation):
- All TypeScript/JavaScript code
- API integrations and business logic
- Development session tracking
- Technical decisions and architecture notes
- Build/deployment configurations

## WORKER OPTIMIZATION FRAMEWORK

### TAX4US 9-WORKER SYSTEM:
**Monday/Thursday 8AM**: Topic Manager → Content Generator → Gutenberg Builder → Translator → Media Processor → Social Publisher (6 workers)  
**Wednesday**: Podcast Producer (processes same-day posts into ElevenLabs → Captivate)  
**Tuesday/Friday 10AM**: SEO Auditor (optimizes low-scoring content via NotebookLM)  
**On-demand**: Data Auto-Healer

### CLAUDE SKILLS FOR MAXIMUM AUTOMATION:
1. **Parallel API calls** - Batch all independent operations 
2. **Error suppression** - Development mode bypasses for external APIs
3. **Real-time task tracking** - TodoWrite for every multi-step process
4. **Decision logging** - Every change documented in `.project-memory/decisions.json`
5. **NotebookLM integration** - Content templates, brand assets, market research
6. **Systematic testing** - Fix functionality, don't just report issues
7. **Change impact analysis** - Consider downstream effects of every modification

## QUALITY STANDARDS

### BEFORE ANY COMMIT:
1. Run linting and type checking
2. Test affected functionality  
3. Document decision reasoning
4. Update session achievements
5. Verify worker schedules remain aligned

### ERROR HANDLING:
- Never ignore console errors
- Implement graceful fallbacks
- Log once, not repeatedly  
- Use development mode bypasses for external APIs
- Test complete end-to-end workflows

### AUTOMATION ACCURACY:
- Master every worker's exact schedule and dependencies
- Understand all API integrations and their failure modes
- Implement proper caching and timeout strategies
- Maintain separation between content (NotebookLM) and code (repository)

This structure ensures maximum automation efficiency with Claude Code skills.