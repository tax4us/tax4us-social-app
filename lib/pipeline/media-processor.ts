import { KieClient } from "../clients/kie-client";
import { WordPressClient } from "../clients/wordpress-client";

export class MediaProcessor {
    private kie: KieClient;
    private wp: WordPressClient;

    constructor() {
        this.kie = new KieClient();
        this.wp = new WordPressClient();
    }

    async generateAndUploadImage(prompt: string, title: string): Promise<string> {
        // 1. Generate image task
        const task = await this.kie.createImage(prompt);
        const taskId = task.data.taskId;

        // 2. Poll for completion (simplified for now)
        let imageUrl = "";
        for (let i = 0; i < 10; i++) {
            await new Promise((r) => setTimeout(r, 5000)); // Wait 5s
            const status = await this.kie.getJobStatus(taskId);
            if (status.data.status === "completed") {
                imageUrl = status.data.url;
                break;
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
        return media.source_url;
    }

    async generateVideo(prompt: string): Promise<string> {
        const task = await this.kie.createVideo(prompt);
        return task.data.taskId; // Return taskId for later polling/webhook
    }
}
