import { AirtableClient } from "../clients/airtable-client";
import { TavilyClient } from "../clients/tavily-client";
import { ClaudeClient } from "../clients/claude-client";
import { Topic } from "../types/pipeline";

export class TopicManager {
    private airtable: AirtableClient;
    private tavily: TavilyClient;
    private claude: ClaudeClient;
    private contentTable: string = "tblq7MDqeogrsdInc"; // Content table ID

    constructor() {
        this.airtable = new AirtableClient();
        this.tavily = new TavilyClient();
        this.claude = new ClaudeClient();
    }

    async fetchReadyTopics(): Promise<Topic[]> {
        const records = await this.airtable.getRecords(this.contentTable, {
            filterByFormula: "AND({Status}='Ready', {Platform}='WP_POST')",
        });

        return (records as any[]).map((rec: { id: string; fields: any }) => ({
            id: rec.id,
            spec_id: rec.fields["Spec ID"],
            title: rec.fields["Title EN"] || rec.fields["title_html"] || "",
            topic: rec.fields["topic"] || "",
            audience: rec.fields["audience"] || "Small business owners in Israel",
            language: rec.fields["lang"] || "en",
            type: "blog_post",
            status: "ready",
            keywords: rec.fields["Keywords"] ? (rec.fields["Keywords"] as string).split(",").map((k: string) => k.trim()) : [],
            outline: rec.fields["Outline"] || "",
        }));
    }

    async researchAndPlan(topic: Topic): Promise<Partial<Topic>> {
        const searchQuery = `${topic.topic} tax laws Israel 2025 trends`;
        const searchResults = await this.tavily.search(searchQuery, { search_depth: "advanced" });

        const systemPrompt = "You are a Content Strategy AI Agent for Tax4Us. Your goal is to analyze search results and create a blog post strategy and outline.";
        const userPrompt = `
      Topic: ${topic.topic}
      Audience: ${topic.audience}
      Search Results: ${JSON.stringify(searchResults.results)}

      Please provide:
      1. A compelling title (Title EN).
      2. A set of target keywords (comma-separated).
      3. A detailed blog post outline (Markdown format).
      4. A brief content strategy description.

      Format your response as JSON:
      {
        "title": "...",
        "keywords": "...",
        "outline": "...",
        "strategy": "..."
      }
    `;

        const response = await this.claude.generate(userPrompt, "claude-3-5-sonnet-20241022", systemPrompt);
        const plan = JSON.parse(response);

        return {
            title: plan.title,
            keywords: plan.keywords.split(",").map((k: string) => k.trim()),
            outline: plan.outline,
            strategy: plan.strategy,
        };
    }

    async updateTopicPlan(topicId: string, plan: Partial<Topic>) {
        const fields: Record<string, string> = {};
        if (plan.title) fields["Title EN"] = plan.title;
        if (plan.keywords) fields["Keywords"] = plan.keywords.join(", ");
        if (plan.outline) fields["Outline"] = plan.outline;
        if (plan.strategy) fields["Strategy"] = plan.strategy; // Assuming there's a Strategy field

        return await this.airtable.updateRecord(this.contentTable, topicId, fields);
    }
}
