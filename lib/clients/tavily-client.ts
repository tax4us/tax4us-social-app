import { pipelineLogger } from "../pipeline/logger";

export class TavilyClient {
    private apiKey: string;

    constructor() {
        this.apiKey = process.env.TAVILY_API_KEY || "";
        if (!this.apiKey) {
            pipelineLogger.warn("TAVILY_API_KEY not set — topic research will be limited");
        }
    }

    async search(query: string, options: { search_depth?: string; max_results?: number } = {}): Promise<{ results: Array<{ title: string; content: string; url: string }> }> {
        if (!this.apiKey) {
            return { results: [] };
        }

        try {
            const response = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    api_key: this.apiKey,
                    query,
                    search_depth: options.search_depth || "advanced",
                    max_results: options.max_results || 5,
                    include_answer: true
                })
            });

            if (!response.ok) {
                pipelineLogger.error(`Tavily search failed: ${response.status}`);
                return { results: [] };
            }

            const data = await response.json();
            return {
                results: (data.results || []).map((r: any) => ({
                    title: r.title,
                    content: r.content,
                    url: r.url
                }))
            };
        } catch (err: any) {
            pipelineLogger.error(`Tavily search error: ${err.message}`);
            return { results: [] };
        }
    }
}
