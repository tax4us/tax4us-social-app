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

        // 3. Upload to WordPress
        const media = await this.wp.uploadMedia(imageUrl, title);
        return media.source_url;
    }

    async generateVideo(prompt: string): Promise<string> {
        const task = await this.kie.createVideo(prompt);
        return task.data.taskId; // Return taskId for later polling/webhook
    }
}
