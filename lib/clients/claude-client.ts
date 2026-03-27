/**
 * Claude API Client for Tax4Us
 * Handles structured content generation and translation.
 */
export class ClaudeClient {
    private apiKey: string;
    private baseUrl = "https://api.anthropic.com/v1/messages";

    constructor() {
        const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
        if (!apiKey) {
            throw new Error("Missing ANTHROPIC_API_KEY or CLAUDE_API_KEY in environment variables.");
        }
        this.apiKey = apiKey;
    }

    async generate(prompt: string, model: string = "claude-3-haiku-20240307", system?: string, maxTokens: number = 4096) {
        const maxRetries = 5;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const response = await fetch(this.baseUrl, {
                method: "POST",
                headers: {
                    "x-api-key": this.apiKey,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model,
                    max_tokens: maxTokens,
                    system,
                    messages: [{ role: "user", content: prompt }],
                }),
            });

            if (response.ok) {
                const data = await response.json();
                return data.content[0].text;
            }

            const error = await response.json().catch(() => ({ error: { type: 'unknown' } }));
            const isRetryable = response.status === 529 || response.status === 503 || response.status === 500;

            if (!isRetryable || attempt === maxRetries) {
                throw new Error(`Claude API Error: ${JSON.stringify(error)}`);
            }

            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // 1s, 2s, 4s, 8s, 16s
            console.log(`[WARN] Claude API ${response.status} (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        throw new Error('Claude API: max retries exceeded');
    }

    /**
     * Specifically for HE -> EN translation using Haiku
     */
    async translate(article: string) {
        const system = "You are a professional Hebrew to English translator. Translate the following Hebrew tax article into fluent, professional English. Return ONLY the translated JSON structure.";
        return this.generate(article, "claude-3-haiku-20240307", system);
    }
}
