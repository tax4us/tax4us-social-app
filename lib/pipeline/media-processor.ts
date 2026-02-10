import { KieClient } from "../clients/kie-client";
import { WordPressClient } from "../clients/wordpress-client";

export class MediaProcessor {
    private kie: KieClient;
    private wp: WordPressClient;

    constructor() {
        this.kie = new KieClient();
        this.wp = new WordPressClient();
    }

    async generateAndUploadImage(prompt: string, title: string): Promise<{ url: string; id: number }> {
        // 1. Generate image task
        const taskId = await this.kie.generateImage(prompt);

        // 2. Poll for completion (simplified for now)
        let imageUrl = "";
        for (let i = 0; i < 15; i++) {
            await new Promise((r) => setTimeout(r, 10000)); // Wait 10s (standard for Kie.ai)
            const response = await this.kie.getTask(taskId);
            const status = response.status;

            if (status === "success" && response.url) {
                imageUrl = response.url;
                break;
            }
            if (status === "failed") {
                throw new Error(`Kie.ai generation failed.`);
            }
        }

        if (!imageUrl) {
            throw new Error("Image generation timed out or failed.");
        }

        // 3. Fetch image buffer
        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) throw new Error(`Failed to download image from ${imageUrl}`);
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = imageRes.headers.get("content-type") || "image/png";
        const filename = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.png`; // Simple sanitize

        // 4. Upload to WordPress
        const media = await this.wp.uploadMedia(buffer, filename, mimeType);
        return { url: media.source_url, id: media.id };
    }

    async generateVideo(prompt: string): Promise<string> {
        const taskId = await this.kie.generateVideo({ title: prompt, excerpt: prompt });
        return taskId; // Return taskId for later polling/webhook
    }
}
