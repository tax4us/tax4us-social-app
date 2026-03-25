/**
 * Intelligent Topic Manager - Replaces basic topic selection with AI-driven strategy
 * Includes seasonal awareness, trend analysis, and performance-driven suggestions
 */

import { ClaudeClient } from "../clients/claude-client";
import { AirtableClient } from "../clients/airtable-client";
import { db } from "../services/database";
import { logger } from "../utils/logger";

interface SeasonalTopic {
  topic: string;
  priority: number;
  urgency: 'high' | 'medium' | 'low';
  deadlines: string[];
  targetAudience: string;
}

interface TopicSuggestion {
  topic: string;
  reasoning: string;
  seasonalRelevance: number;
  competitiveGap: boolean;
  estimatedTraffic: number;
  difficulty: 'easy' | 'medium' | 'hard';
  keyQuestions: string[];
}

export class IntelligentTopicManager {
  private claude: ClaudeClient;
  private airtable: AirtableClient;
  
  constructor() {
    this.claude = new ClaudeClient();
    this.airtable = new AirtableClient();
  }

  /**
   * Get seasonally-appropriate topics based on current date and tax calendar
   */
  private getSeasonalTopics(): SeasonalTopic[] {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const day = now.getDate();
    
    // Q1 (Jan-Mar): Tax Filing Season
    if (month >= 0 && month <= 2) {
      return [
        {
          topic: "FBAR Filing Requirements for Israeli-Americans",
          priority: 10,
          urgency: 'high',
          deadlines: ["April 15"],
          targetAudience: "Israeli-Americans with foreign accounts"
        },
        {
          topic: "Form 8938 vs FBAR: Complete Comparison Guide",
          priority: 9,
          urgency: 'high', 
          deadlines: ["April 15"],
          targetAudience: "High net worth individuals"
        },
        {
          topic: "Last-Minute Tax Planning Strategies for Dual Citizens",
          priority: 8,
          urgency: month === 2 ? 'high' : 'medium',
          deadlines: ["April 15"],
          targetAudience: "Procrastinating taxpayers"
        }
      ];
    }
    
    // Q2 (Apr-Jun): Post-Filing Analysis
    if (month >= 3 && month <= 5) {
      return [
        {
          topic: "What to Do After Filing Your US Taxes from Israel",
          priority: 7,
          urgency: 'medium',
          deadlines: ["June 15 (Quarterly estimates)"],
          targetAudience: "Recent tax filers"
        },
        {
          topic: "Planning for Next Tax Year: Lessons from 2026 Filing Season",
          priority: 6,
          urgency: 'low',
          deadlines: [],
          targetAudience: "Proactive planners"
        }
      ];
    }
    
    // Q3 (Jul-Sep): Mid-Year Planning
    if (month >= 6 && month <= 8) {
      return [
        {
          topic: "Mid-Year Tax Strategies for Israeli Business Owners",
          priority: 8,
          urgency: 'medium',
          deadlines: ["September 15 (Q3 estimates)"],
          targetAudience: "Business owners"
        },
        {
          topic: "Israeli Real Estate Sales: US Tax Implications",
          priority: 7,
          urgency: 'medium',
          deadlines: [],
          targetAudience: "Property investors"
        }
      ];
    }
    
    // Q4 (Oct-Dec): Year-End Planning
    if (month >= 9 && month <= 11) {
      return [
        {
          topic: "Year-End Tax Planning for Israeli-Americans",
          priority: 10,
          urgency: 'high',
          deadlines: ["December 31"],
          targetAudience: "All taxpayers"
        },
        {
          topic: "Tax Loss Harvesting Strategies for Dual Citizens",
          priority: 8,
          urgency: 'high',
          deadlines: ["December 31"],
          targetAudience: "Investors"
        },
        {
          topic: "Maximizing US-Israel Tax Treaty Benefits Before Year End",
          priority: 9,
          urgency: 'high',
          deadlines: ["December 31"],
          targetAudience: "High earners"
        }
      ];
    }

    return [];
  }

  /**
   * Analyze recent content to avoid repetition and identify gaps
   */
  private async analyzeContentGaps(): Promise<string[]> {
    // Get recent published articles
    const allContent = await db.getContentPieces();
    const recentContent = allContent
      .filter(c => c.status === 'published')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50);

    // Extract topics and identify patterns
    const recentTopics = recentContent.map(c => c.title_english.toLowerCase());
    
    // Common tax topics that should be covered regularly
    const coreTaxTopics = [
      'fbar', 'fatca', 'form 8938', 'treaty benefits', 'exit tax',
      'business formation', 'real estate', 'cryptocurrency', 'pension plans',
      'estimated taxes', 'foreign tax credit', 'pfic', 'controlled foreign corporation'
    ];

    // Find topics we haven't covered recently
    const contentGaps = coreTaxTopics.filter(topic => 
      !recentTopics.some(recent => recent.includes(topic))
    );

    logger.info('IntelligentTopicManager', `Found ${contentGaps.length} content gaps`, { contentGaps });
    return contentGaps;
  }

  /**
   * Generate intelligent topic suggestions using Claude
   */
  private async generateTopicSuggestions(
    seasonalTopics: SeasonalTopic[],
    contentGaps: string[],
    recentNews: string[] = []
  ): Promise<TopicSuggestion[]> {
    
    const systemPrompt = `You are an expert tax content strategist for Tax4US, serving Israeli-Americans and dual citizens.

CONTEXT:
- Tax4US is the leading cross-border tax advisory serving 1,000+ Israeli-American clients
- Content focuses on US-Israel taxation complexities, compliance, and optimization
- Target audience: Business owners, investors, and high-net-worth individuals in Israel

CONTENT STRATEGY PRINCIPLES:
1. Seasonal Relevance: Tax topics must align with filing deadlines and planning cycles
2. Audience Pain Points: Address real compliance challenges faced by Israeli-Americans
3. Competitive Advantage: Cover topics competitors miss or oversimplify
4. Search Intent: Target high-intent keywords that drive qualified leads
5. Authoritative Depth: Each article should be the definitive resource on its topic

OUTPUT REQUIREMENTS:
Generate exactly 3 topic suggestions in JSON format with this structure:
{
  "suggestions": [
    {
      "topic": "Specific, compelling topic title",
      "reasoning": "Why this topic matters now",
      "seasonalRelevance": 1-10,
      "competitiveGap": true/false,
      "estimatedTraffic": 100-5000,
      "difficulty": "easy|medium|hard",
      "keyQuestions": ["Question 1", "Question 2", "Question 3"]
    }
  ]
}`;

    const userPrompt = `
SEASONAL CONTEXT (Current Priority Topics):
${seasonalTopics.map(t => `- ${t.topic} (Priority: ${t.priority}, Urgency: ${t.urgency})`).join('\n')}

CONTENT GAPS (Topics We Haven't Covered Recently):
${contentGaps.length > 0 ? contentGaps.join(', ') : 'No major gaps identified'}

RECENT NEWS/EVENTS:
${recentNews.length > 0 ? recentNews.join(', ') : 'No specific news events provided'}

CURRENT DATE: ${new Date().toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}

Generate 3 strategic topic suggestions that:
1. Align with current seasonal priorities
2. Fill identified content gaps
3. Target high-intent search queries
4. Provide unique value proposition vs competitors
5. Address real client pain points

Focus on actionable, specific topics rather than generic tax advice.`;

    try {
      const response = await this.claude.generate(userPrompt, "claude-3-5-sonnet-20241022", systemPrompt);
      const parsed = JSON.parse(response);
      return parsed.suggestions;
    } catch (error) {
      logger.error('IntelligentTopicManager', 'Failed to generate topic suggestions', { error });
      throw error;
    }
  }

  /**
   * Score topic suggestions based on multiple factors
   */
  private scoreTopicSuggestions(suggestions: TopicSuggestion[]): TopicSuggestion[] {
    return suggestions.map(suggestion => ({
      ...suggestion,
      score: this.calculateTopicScore(suggestion)
    })).sort((a, b) => (b as any).score - (a as any).score);
  }

  private calculateTopicScore(suggestion: TopicSuggestion): number {
    let score = 0;
    
    // Seasonal relevance (0-25 points)
    score += suggestion.seasonalRelevance * 2.5;
    
    // Competitive gap bonus (0-20 points)
    score += suggestion.competitiveGap ? 20 : 0;
    
    // Traffic potential (0-20 points) 
    score += Math.min(suggestion.estimatedTraffic / 250, 20);
    
    // Difficulty penalty (0-15 points)
    const difficultyBonus = {
      'easy': 15,
      'medium': 10,
      'hard': 5
    };
    score += difficultyBonus[suggestion.difficulty];
    
    // Question richness (0-20 points)
    score += Math.min(suggestion.keyQuestions.length * 3, 20);
    
    return Math.round(score);
  }

  /**
   * Main method: Generate intelligent topic suggestion
   */
  async generateIntelligentTopic(): Promise<{
    topic: string;
    reasoning: string;
    metadata: {
      seasonalRelevance: number;
      estimatedTraffic: number;
      keyQuestions: string[];
      contentStrategy: string;
    };
  }> {
    logger.info('IntelligentTopicManager', 'Starting intelligent topic generation');

    try {
      // 1. Get seasonal context
      const seasonalTopics = this.getSeasonalTopics();
      
      // 2. Analyze content gaps
      const contentGaps = await this.analyzeContentGaps();
      
      // 3. Generate suggestions
      const suggestions = await this.generateTopicSuggestions(seasonalTopics, contentGaps);
      
      // 4. Score and rank suggestions
      const scoredSuggestions = this.scoreTopicSuggestions(suggestions);
      
      // 5. Select best topic
      const bestTopic = scoredSuggestions[0];
      
      logger.info('IntelligentTopicManager', 'Generated intelligent topic', {
        topic: bestTopic.topic,
        score: (bestTopic as any).score,
        seasonalRelevance: bestTopic.seasonalRelevance
      });

      return {
        topic: bestTopic.topic,
        reasoning: bestTopic.reasoning,
        metadata: {
          seasonalRelevance: bestTopic.seasonalRelevance,
          estimatedTraffic: bestTopic.estimatedTraffic,
          keyQuestions: bestTopic.keyQuestions,
          contentStrategy: `${bestTopic.difficulty} difficulty topic targeting ${bestTopic.estimatedTraffic} monthly searches`
        }
      };

    } catch (error) {
      logger.error('IntelligentTopicManager', 'Intelligent topic generation failed', { error });
      
      // Fallback to basic topic generation
      const fallbackTopics = this.getSeasonalTopics();
      if (fallbackTopics.length > 0) {
        const fallback = fallbackTopics[0];
        return {
          topic: fallback.topic,
          reasoning: "Fallback to seasonal topic due to generation error",
          metadata: {
            seasonalRelevance: fallback.priority,
            estimatedTraffic: 1000,
            keyQuestions: ["What are the requirements?", "How do I comply?", "What are the penalties?"],
            contentStrategy: "Seasonal fallback topic"
          }
        };
      }
      
      throw error;
    }
  }
}