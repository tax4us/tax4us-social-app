import { ClaudeClient } from "../clients/claude-client";

export class Translator {
    private claude: ClaudeClient;

    constructor() {
        this.claude = new ClaudeClient();
    }

    async translateHeToEn(content: string): Promise<string> {
        const systemPrompt = "You are a specialized translator for Israeli tax and financial content. Your goal is to translate Hebrew content to professional English while maintaining accurate terminology (CPAs, IRS, VAT, etc.).";
        const userPrompt = `
      Please translate the following Hebrew blog post content to English.
      Maintain all WordPress Gutenberg block comments (<!-- wp:... -->).
      Ensure the tone remains professional and equivalent to the source.

      Hebrew Content:
      ${content}
    `;

        return await this.claude.generate(userPrompt, "claude-3-haiku-20240307", systemPrompt);
    }

    async translateEnToHe(content: string): Promise<string> {
        const systemPrompt = "You are a specialized translator for tax and financial content. Your goal is to translate English content to professional Hebrew (Israeli Hebrew) while maintaining accurate terminology.";
        const userPrompt = `
      Please translate the following English blog post content to Hebrew.
      Maintain all WordPress Gutenberg block comments (<!-- wp:... -->).
      Ensure the tone remains professional and equivalent to the source.

      English Content:
      ${content}
    `;

        return await this.claude.generate(userPrompt, "claude-3-haiku-20240307", systemPrompt);
    }
}
