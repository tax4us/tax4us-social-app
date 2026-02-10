/**
 * Claude API Client for Tax4Us
 * Handles structured content generation and translation.
 */
export class ClaudeClient {
    private apiKey: string;
    private baseUrl = "https://api.anthropic.com/v1/messages";

    constructor() {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            throw new Error("Missing ANTHROPIC_API_KEY in environment variables.");
        }
        this.apiKey = apiKey;
    }

    async generate(prompt: string, model: string = "claude-3-5-sonnet-20241022", system?: string) {
        const response = await fetch(this.baseUrl, {
            method: "POST",
            headers: {
                "x-api-key": this.apiKey,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model,
                max_tokens: 8192,
                system,
                messages: [{ role: "user", content: prompt }],
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Claude API Error: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        return data.content[0].text;
    }

    /**
     * Specifically for HE -> EN translation using Haiku
     */
    async translate(article: string) {
        const system = "You are a professional Hebrew to English translator. Translate the following Hebrew tax article into fluent, professional English. Return ONLY the translated JSON structure.";
        return this.generate(article, "claude-3-haiku-20240307", system);
    }
}
