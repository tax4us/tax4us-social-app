import { ElevenLabsClient } from "../clients/elevenlabs-client";
import { CaptivateClient } from "../clients/captivate-client";
import { ClaudeClient } from "../clients/claude-client";

export class PodcastProducer {
    private elevenLabs: ElevenLabsClient;
    private captivate: CaptivateClient;
    private claude: ClaudeClient;

    constructor() {
        this.elevenLabs = new ElevenLabsClient();
        this.captivate = new CaptivateClient();
        this.claude = new ClaudeClient();
    }

    async produceFromArticle(articleHtml: string, title: string) {
        console.log(`Producing podcast script for: ${title}`);

        // 0. Clean HTML
        const plainText = articleHtml.replace(/<[^>]+>/g, " ").substring(0, 10000); // Limit context

        // 1. Generate Podcast Script from Article
        const scriptPrompt = `
      Convert the following blog post article into a dynamic, engaging podcast script for a single host.
      The host is an expert in Israeli tax. The script should be natural, conversational, and informative.
      Target length: 3-5 minutes (approx 600-800 words).
      IMPORTANT: The output must be less than 4500 characters to fit audio generation limits.

      Article:
      ${plainText}
    `;

        let script = await this.claude.generate(scriptPrompt, "claude-3-5-sonnet-20241022");

        // Safety truncation
        if (script.length > 5000) {
            console.warn("Script exceeded 5000 chars, truncating...");
            script = script.substring(0, 4999);
        }

        // 2. Generate Audio with Retry
        console.log(`Generating audio with ElevenLabs...`);
        let audioBuffer: ArrayBuffer;

        try {
            audioBuffer = await this.generateAudioWithRetry(script);
        } catch (error) {
            console.error("Failed to generate audio after retries:", error);
            throw error; // Let the orchestrator handle the failure logging
        }

        // 3. Upload to Captivate.fm
        console.log(`Uploading to Captivate.fm...`);
        try {
            const summaryPrompt = `Create a short, catchy podcast summary and shownotes for this script:\n\n${script}`;
            const summary = await this.claude.generate(summaryPrompt, "claude-3-5-haiku-20241022");

            const result = await this.captivate.uploadEpisode(audioBuffer, {
                title,
                summary,
            });
            return result;
        } catch (error) {
            console.error("Failed to upload to Captivate:", error);
            // Non-blocking error as per SOP? 
            // "If Captivate upload fails, log error... but do not block social publishing."
            // Since this runs *after* social publishing in the orchestrator, we can just throw or return null.
            // Returning null to signal partial success.
            return null;
        }
    }

    private async generateAudioWithRetry(text: string, attempts = 3): Promise<ArrayBuffer> {
        for (let i = 0; i < attempts; i++) {
            try {
                return await this.elevenLabs.generateSpeech(text);
            } catch (error: any) {
                console.warn(`ElevenLabs attempt ${i + 1} failed: ${error.message}`);
                if (i === attempts - 1) throw error;
                const delay = Math.pow(2, i) * 1000;
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        throw new Error("Unreachable");
    }
}
