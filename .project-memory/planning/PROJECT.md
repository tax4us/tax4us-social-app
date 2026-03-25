# TAX4US Content Automation Pipeline

## Core Value Proposition

Complete autonomous content pipeline that transforms tax expertise into multi-channel digital assets for maximum business impact. The system generates bilingual content (Hebrew/English), produces podcasts, creates social media posts, and optimizes for search visibility - all with minimal human intervention.

## Business Context

TAX4US is an Israeli tax advisory firm targeting both Hebrew-speaking locals and English-speaking expats. The content pipeline serves as a 24/7 digital sales force, creating educational content that demonstrates expertise and generates leads across multiple channels.

## Current State

- **Architecture**: Next.js app with 9-worker content automation system
- **Workers**: Monday/Thursday content generation (6 workers), Wednesday podcast production, Tuesday/Friday SEO optimization, on-demand data healing
- **Integrations**: WordPress, Slack, ElevenLabs, Captivate, Facebook, LinkedIn, NotebookLM, Kie.ai
- **Dashboard**: Executive center with real-time pipeline monitoring
- **Languages**: Bilingual Hebrew/English content generation

## Success Metrics

1. **Autonomous Operation**: 95%+ pipeline runs without human intervention
2. **Content Quality**: 90%+ SEO scores for all published articles
3. **Multi-channel Distribution**: Articles + podcasts + social posts for every topic
4. **Real-time Monitoring**: Complete visibility into pipeline status and performance
5. **Integration Reliability**: All external APIs functioning with proper fallbacks

## Technical Constraints

- **Next.js Framework**: App router pattern with strict folder organization
- **External Dependencies**: Multiple third-party APIs requiring robust error handling
- **Bilingual Content**: Hebrew primary, English translation required
- **Approval Gates**: Slack-based human approval points for quality control
- **Real-time Updates**: Dashboard must reflect current pipeline state
- **Cron Scheduling**: Workers must run on specific days/times (Monday/Thursday 8AM, Wednesday, Tuesday/Friday 10AM)