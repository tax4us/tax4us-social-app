import { pipelineLogger } from "../pipeline/logger";

export class KieClient {
    private apiKey: string;
    private baseUrl: string = "https://api.kie.ai/api/v1";

    constructor() {
        this.apiKey = process.env.KIE_API_KEY || "3ca74c96d52beaef45650eb629876245"; // Warning: Harcoded fallback from n8n
    }

    private async fetchWithRetry(url: string, options: any, retries: number = 3): Promise<any> {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                if (response.ok) return response;
                if (response.status >= 500 && i < retries - 1) {
                    pipelineLogger.warn(`Kie.ai [${response.status}] - Retrying (${i + 1}/${retries})...`);
                    await new Promise(r => setTimeout(r, 2000 * (i + 1)));
                    continue;
                }
                return response;
            } catch (e) {
                if (i === retries - 1) throw e;
                pipelineLogger.warn(`Kie.ai Fetch Error - Retrying (${i + 1}/${retries})...`);
                await new Promise(r => setTimeout(r, 2000 * (i + 1)));
            }
        }
    }

    async generateVideo(params: {
        title: string,
        excerpt: string,
        style?: "abstract" | "documentary" | "corporate"
    }) {
        // Temporary bypass: Kie.ai API appears to be deprecated/changed
        if (process.env.NODE_ENV === "development" || process.env.DISABLE_KIE_AI === "true") {
            pipelineLogger.warn("Kie.ai bypassed in development mode", "KIE_AI");
            return "dev-video-placeholder";
        }

        const style = params.style || "documentary";

        // Base hook and blueprint based on user's high-engagement reference
        let prompt = "";

        if (style === "documentary") {
            prompt = `Raw documentary aesthetic video for: "${params.title}". 
            Blueprints: 
            - Consistent character anchor: A professional, friendly person (Likeness of @shai-lfc.tax4us) as the cross-cultural bridge.
            - Emotional hook (first 2s): Close-up with an expressive "Look what they did" or "Listen to that" vibe.
            - Visual delivery: Subtle urgency, mixed-language cues (English/Hebrew text or cultural symbols).
            - Creative format twist: Handheld camera motion, authentic lighting.
            - Clear CTA: Visual cue for "Wake up!" or "Share this!".
            - Flags: Specific US and Israeli flags integrated into the background.
            - Aspect Ratio: Vertical 9:16. No text overlay.`;
        } else {
            prompt = `Abstract and friendly financial services motion graphics for: "${params.title}". 
            Visuals: Warm and inviting abstract shapes, flowing lines, integrated US and Israeli flags waving subtly. 
            Colors: Professional green (#8fb634), white, and soft accent tones. 
            Include a subtle digital handle @shai-lfc.tax4us integrated into the background design. 
            Style: Clean, premium, 3D abstract elements. Vertical format. Looping background video. No text overlay.`;
        }

        try {
            let response = await this.fetchWithRetry(`${this.baseUrl}/jobs/createTask`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "veo-3", // Using working Veo 3 model for 2026
                    input: {
                        prompt: prompt,
                        aspect_ratio: "9:16", // Portrait format
                        resolution: "1080p",
                        duration: "8s",
                        seed: Math.floor(Math.random() * 1000000)
                    }
                })
            });

            // FALLBACK logic: If Sora fails, attempt high-quality Image generation
            if (!response.ok) {
                pipelineLogger.warn("Sora creation failed. Falling back to high-quality Image generation (Flux)...", "KIE_AI");
                return await this.generateImage(`Premium documentary aesthetic for: ${params.title}. ${params.excerpt}`);
            }

            const data = await response.json();
            const taskId = data.data?.taskId || data.taskId;

            if (!taskId) {
                pipelineLogger.warn("Kie.ai did not return a taskId. Attempting Image fallback...", "KIE_AI");
                return await this.generateImage(`Premium documentary aesthetic for: ${params.title}. ${params.excerpt}`);
            }

            pipelineLogger.info(`Task ID: ${taskId}`, "KIE_AI");
            return taskId;

        } catch (error: any) {
            pipelineLogger.error(`Kie.ai Generation Error: ${error.message}. Attempting Image fallback...`);
            try {
                return await this.generateImage(`Premium documentary aesthetic for: ${params.title}. ${params.excerpt}`);
            } catch (fallbackError) {
                throw error; // If both fail, throw original error
            }
        }
    }

    async generateImage(prompt: string) {
        // Temporary bypass: Kie.ai API appears to be deprecated/changed
        if (process.env.NODE_ENV === "development" || process.env.DISABLE_KIE_AI === "true") {
            pipelineLogger.warn("Kie.ai image bypassed in development mode", "KIE_AI");
            return "dev-image-placeholder";
        }

        pipelineLogger.agent(`Initiating Image generation for: "${prompt.substring(0, 50)}..."`, "KIE_AI");

        try {
            const response = await fetch(`${this.baseUrl}/jobs/createTask`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "flux-pro", // Using working Flux Pro model for 2026
                    input: {
                        prompt: prompt,
                        aspect_ratio: "16:9", // Blog post featured image
                        resolution: "2K",
                        format: "png"
                    }
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Kie.ai Image Generation Failed [${response.status}]: ${error}`);
            }

            const data = await response.json();
            const taskId = data.data?.taskId || data.taskId;

            if (!taskId) {
                throw new Error(`Kie.ai did not return a taskId. Response: ${JSON.stringify(data)}`);
            }

            pipelineLogger.info(`Image Task ID: ${taskId}`, "KIE_AI");
            return taskId;

        } catch (error: any) {
            pipelineLogger.error(`Kie.ai Image Generation Error: ${error.message}`);
            throw error;
        }
    }

    async getTask(taskId: string): Promise<{ status: string; url?: string; videoUrl?: string; error?: string }> {
        const response = await fetch(`${this.baseUrl}/jobs/recordInfo?taskId=${taskId}`, {
            headers: {
                "Authorization": `Bearer ${this.apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`Kie.ai Status Check Failed: ${response.status}`);
        }

        const data = await response.json();
        // n8n logic checks data.data.state === 'success'
        const state = data.data?.state || data.state;

        if (state === "success") {
            // Kie.ai returns nested JSON for video results
            let resultUrl = data.data?.url || data.url || data.data?.videoUrl || data.videoUrl;

            if (!resultUrl && data.data?.resultJson) {
                try {
                    const result = JSON.parse(data.data.resultJson);
                    resultUrl = result.resultUrls?.[0];
                } catch (e) {
                    pipelineLogger.error(`Failed to parse Kie.ai resultJson: ${e}`);
                }
            }

            return { status: "success", url: resultUrl, videoUrl: resultUrl };
        } else if (state === "fail" || state === "failed") {
            const error = data.data?.failMsg || data.failMsg || "Unknown error";
            pipelineLogger.error(`Kie.ai Task Failed: ${error}`, "KIE_AI");
            return { status: "failed", error };
        }

        return { status: "processing" };
    }

    async waitForVideo(taskId: string, timeoutMs: number = 600000): Promise<string> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            const status = await this.getTask(taskId);

            if (status.status === "success" && status.videoUrl) {
                return status.videoUrl;
            }

            if (status.status === "failed") {
                throw new Error("Kie.ai task failed.");
            }

            // Wait 10 seconds (matching n8n wait time roughly)
            await new Promise(resolve => setTimeout(resolve, 10000));
        }

        throw new Error("Kie.ai task timed out.");
    }
}
