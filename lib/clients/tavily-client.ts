export class TavilyClient {
    private apiKey: string;
    private baseUrl: string = "https://api.tavily.com/search";

    constructor() {
        this.apiKey = process.env.TAVILY_API_KEY || "";
        if (!this.apiKey) {
            throw new Error("Missing TAVILY_API_KEY in environment variables.");
        }
    }

    async search(query: string, options: { search_depth?: 'basic' | 'advanced'; max_results?: number } = {}) {
        const response = await fetch(this.baseUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                api_key: this.apiKey,
                query,
                search_depth: options.search_depth || "basic",
                max_results: options.max_results || 5,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Tavily API Error: ${JSON.stringify(error)}`);
        }

        return await response.json();
    }
}
