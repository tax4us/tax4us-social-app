import { ClaudeClient } from "../clients/claude-client";

export class Translator {
    private claude: ClaudeClient;

    constructor() {
        this.claude = new ClaudeClient();
    }

    async translateHeToEn(content: string): Promise<string> {
        const systemPrompt = "You are a specialized translator for Israeli tax and financial content. Translate Hebrew to professional English. Output ONLY the translated content — no preamble, no notes. Start directly with the translated text.";
        const userPrompt = `Translate this Hebrew blog post to English. Output ONLY the English translation, nothing else. Maintain all HTML tags and Gutenberg block comments (<!-- wp:... -->).

${content}`;

        return await this.claude.generate(userPrompt, "claude-sonnet-4-20250514", systemPrompt, 10000);
    }

    async translateEnToHe(content: string): Promise<string> {
        const systemPrompt = "You are a specialized translator for tax and financial content. Translate English to professional Israeli Hebrew. Output ONLY the translated content — no preamble, no 'here is the translation', no notes. Start directly with the translated text.";
        const userPrompt = `Translate this English blog post to Hebrew. Output ONLY the Hebrew translation, nothing else. Maintain all HTML tags and Gutenberg block comments (<!-- wp:... -->). Keep technical terms like Form 8865, IRS, FBAR in English within the Hebrew text.

${content}`;

        return await this.claude.generate(userPrompt, "claude-sonnet-4-20250514", systemPrompt, 10000);
    }
}
