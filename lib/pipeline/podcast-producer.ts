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

    async produceFromArticle(articleContent: string, title: string) {
        console.log(`Producing podcast script for: ${title}`);

        // 1. Generate Podcast Script from Article
        const scriptPrompt = `
      Convert the following blog post article into a dynamic, engaging podcast script for a single host.
      The host is an expert in Israeli tax. The script should be natural, conversational, and informative.
      Target length: 3-5 minutes (approx 600-800 words).

      Article:
      ${articleContent}
    `;

        const script = await this.claude.generate(scriptPrompt, "claude-3-5-sonnet-20241022");

        // 2. Generate Audio
        console.log(`Generating audio with ElevenLabs...`);
        const audioBuffer = await this.elevenLabs.generateSpeech(script);

        // 3. Upload to Captivate.fm
        console.log(`Uploading to Captivate.fm...`);
        const summaryPrompt = `Create a short, catchy podcast summary and shownotes for this script:\n\n${script}`;
        const summary = await this.claude.generate(summaryPrompt, "claude-3-5-haiku-20241022");

        const result = await this.captivate.uploadEpisode(audioBuffer, {
            title,
            summary,
        });

        return result;
    }
}
