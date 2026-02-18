---
name: skill-creator
description: >-
  Meta-skill for creating, managing, and optimizing Claude skills. Use when you need 
  to create new skills, audit existing skills, or enhance skill functionality. 
  Follows Anthropic's skill creation standards and progressive disclosure framework.
  Example: "Create a comprehensive API integration skill for handling external services."
---

# Skill Creator Meta-Skill

## Critical Standards
- **Follow Anthropic Guidelines** - Adhere to official skill creation patterns
- **Progressive Disclosure** - Layer information from basic to advanced
- **Practical Focus** - Every skill must solve real problems
- **Self-Improving** - Skills should enhance themselves through use

## Skill Creation Framework

### 1. Skill Identification
Before creating a skill, verify it's needed:
```
Requirements Analysis:
□ Problem occurs frequently (>3 times)
□ Problem is complex enough to warrant documentation
□ Existing skills don't cover this domain
□ Solution would benefit future sessions
□ Domain has learnable patterns and best practices
```

### 2. Skill Architecture
Standard skill structure:
```
SKILL.md (main file)
├── Metadata (name, description, constraints)
├── Critical Section (most important points)
├── Core Workflow (step-by-step process)
├── Advanced Techniques (power-user features)
├── Reference Materials (detailed documentation)
└── Self-Improvement (how skill evolves)

references/ (supporting documentation)
├── patterns.md (common patterns and solutions)
├── troubleshooting.md (known issues and fixes)
├── examples.md (real-world usage examples)
└── advanced.md (expert-level techniques)

scripts/ (automation and utilities)
├── init.sh (skill initialization)
├── validate.sh (skill validation)
└── test.sh (skill testing)
```

### 3. Skill Quality Gates

#### Gate 1: Concept Validation
- [ ] Problem clearly defined
- [ ] Solution approach validated
- [ ] Success criteria established
- [ ] Scope appropriately bounded

#### Gate 2: Content Quality
- [ ] Information accurate and current
- [ ] Examples are practical and tested
- [ ] Progressive disclosure implemented
- [ ] Critical information highlighted

#### Gate 3: Usability Testing
- [ ] Skill solves intended problems
- [ ] Instructions are clear and actionable
- [ ] Examples work as documented
- [ ] Performance meets expectations

## Skill Types and Templates

### A. Domain-Specific Skills
For specific technologies or problem areas:
```markdown
---
name: [technology]-master
description: >-
  Comprehensive [technology] expertise covering [key areas].
  Use when [specific scenarios]. Not for [excluded scenarios].
---

## Critical
- Key constraints and requirements
- Most important warnings or gotchas

## Core Patterns
- Essential techniques and approaches
- Most common use cases

## Advanced Techniques
- Power-user features
- Optimization strategies

## Troubleshooting
- Common issues and solutions
```

### B. Process Skills
For workflows and methodologies:
```markdown
---
name: [process]-workflow
description: >-
  Systematic approach to [process] with quality gates and validation.
  Use when [workflow scenarios].
---

## Workflow Steps
1. Initialization
2. Execution phases
3. Validation checkpoints
4. Completion criteria

## Quality Gates
- Validation requirements at each stage
- Go/no-go decision points

## Success Metrics
- How to measure effectiveness
```

### C. Meta-Skills
For skill management and enhancement:
```markdown
---
name: [capability]-enhancer
description: >-
  Enhances [capability] across all problem domains.
  Use when [enhancement needed].
---

## Enhancement Framework
- Core principles
- Application patterns
- Integration with other skills
```

## Advanced Skill Patterns

### Self-Updating Skills
Skills that improve based on usage:
```markdown
## Learning Integration
- Track usage patterns
- Identify improvement opportunities
- Implement enhancements automatically
- Version control improvements
```

### Interconnected Skills
Skills that reference and build upon each other:
```markdown
## Skill Dependencies
- Required prerequisite skills
- Recommended companion skills
- Integration points and handoffs
```

### Adaptive Skills
Skills that adjust to context:
```markdown
## Context Awareness
- Project-specific adaptations
- Environment-specific modifications
- User-level customizations
```

## Skill Testing and Validation

### Testing Framework
```bash
# Test skill completeness
scripts/validate-skill.sh --completeness

# Test skill accuracy
scripts/validate-skill.sh --accuracy

# Test skill performance
scripts/validate-skill.sh --performance
```

### Validation Checklist
- [ ] Metadata complete and accurate
- [ ] Description matches functionality
- [ ] Critical section highlights key points
- [ ] Examples are tested and working
- [ ] References provide adequate detail
- [ ] Skill solves stated problems
- [ ] Performance is acceptable
- [ ] No security vulnerabilities

## Skill Maintenance

### Regular Reviews
Monthly skill audit process:
1. **Usage Analysis** - Which skills are used most/least
2. **Accuracy Check** - Verify information is still current
3. **Gap Analysis** - Identify missing capabilities
4. **Performance Review** - Measure skill effectiveness
5. **User Feedback** - Incorporate improvement suggestions

### Version Control
Track skill evolution:
```
v1.0: Initial creation
v1.1: Bug fixes and clarifications
v2.0: Major enhancement or restructure
v2.1: Performance improvements
```

### Deprecation Process
When skills become obsolete:
1. Mark as deprecated in metadata
2. Redirect to replacement skill
3. Maintain for transition period
4. Archive when no longer needed

## Meta-Patterns

### The Skill Ecosystem
How skills work together:
- **Foundational Skills**: Core capabilities (superpowers, debugging)
- **Domain Skills**: Technology-specific expertise
- **Process Skills**: Workflow and methodology
- **Integration Skills**: Cross-domain problem solving

### Skill Discovery
Help users find the right skill:
- Clear naming conventions
- Comprehensive descriptions
- Cross-references between related skills
- Usage examples and scenarios

### Skill Evolution
How skills grow and improve:
- Usage feedback integration
- Performance optimization
- Knowledge base expansion
- Community contribution integration

## Creation Workflow

### Standard Skill Creation Process
1. **Problem Identification** - What needs solving?
2. **Research and Analysis** - Understand the domain
3. **Skill Design** - Plan structure and content
4. **Implementation** - Write the skill
5. **Testing** - Validate functionality
6. **Documentation** - Create supporting materials
7. **Deployment** - Make available for use
8. **Monitoring** - Track usage and effectiveness

### Quality Assurance
Every skill must pass:
- **Completeness Check** - All sections present
- **Accuracy Validation** - Information correct
- **Usability Testing** - Instructions work
- **Performance Measurement** - Acceptable speed
- **Security Review** - No vulnerabilities

This meta-skill continuously improves skill creation capabilities and maintains the skill ecosystem quality.