import { pipelineLogger } from "../pipeline/logger";

// TAX4US Kie.ai API key prefix — credential isolation guard
const TAX4US_KIE_KEY_PREFIX = "3ca74c96";

interface ObservatoryRecommendation {
    model: string;
    kieModelParam: string;
    kieEndpoint: string;
    cost: number;
    fallback: { model: string; kieModelParam: string; kieEndpoint: string } | null;
}

export class KieClient {
    private apiKey: string;
    private baseUrl: string = "https://api.kie.ai/api/v1";
    private observatoryCache: Map<string, { data: ObservatoryRecommendation; expiresAt: number }> = new Map();

    constructor() {
        this.apiKey = process.env.KIE_API_KEY || "3ca74c96d52beaef45650eb629876245";
        // CREDENTIAL ISOLATION: Reject any key that isn't TAX4US's own
        if (!this.apiKey.startsWith(TAX4US_KIE_KEY_PREFIX)) {
            throw new Error(`KieClient credential isolation violation: key does not match TAX4US prefix. Got: ${this.apiKey.substring(0, 8)}...`);
        }
    }

    /**
     * Query SuperSeller Observatory for optimal model selection.
     * Returns ONLY model names/endpoints — never credentials.
     * Falls back to hardcoded defaults if Observatory is unreachable.
     */
    private async getModelRecommendation(useCase: string, fallbackModel: string): Promise<{ model: string; endpoint: string }> {
        // Check cache (5 min TTL)
        const cached = this.observatoryCache.get(useCase);
        if (cached && cached.expiresAt > Date.now()) {
            return { model: cached.data.kieModelParam, endpoint: cached.data.kieEndpoint };
        }

        const cronSecret = process.env.SUPERSELLER_CRON_SECRET;
        if (!cronSecret) {
            pipelineLogger.warn(`Observatory: no SUPERSELLER_CRON_SECRET — using hardcoded ${fallbackModel}`);
            return { model: fallbackModel, endpoint: "/api/v1/jobs/createTask" };
        }

        try {
            const res = await fetch(
                `https://api.superseller.agency/api/observatory/recommend?useCase=${encodeURIComponent(useCase)}`,
                { headers: { Authorization: `Bearer ${cronSecret}` } }
            );
            if (!res.ok) {
                pipelineLogger.warn(`Observatory returned ${res.status} for ${useCase} — using ${fallbackModel}`);
                return { model: fallbackModel, endpoint: "/api/v1/jobs/createTask" };
            }
            const data: ObservatoryRecommendation = await res.json();
            this.observatoryCache.set(useCase, { data, expiresAt: Date.now() + 5 * 60 * 1000 });
            pipelineLogger.info(`Observatory recommends ${data.model} for ${useCase} ($${data.cost}/unit)`);
            return { model: data.kieModelParam, endpoint: data.kieEndpoint };
        } catch (err: any) {
            pipelineLogger.warn(`Observatory unreachable: ${err.message} — using ${fallbackModel}`);
            return { model: fallbackModel, endpoint: "/api/v1/jobs/createTask" };
        }
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
        if (process.env.DISABLE_KIE_AI === "true") {
            pipelineLogger.warn("Kie.ai explicitly disabled", "KIE_AI");
            return "kie-disabled-placeholder";
        }

        // PRIMARY: Kling 3.0 with illustrated coin mascot (NOT @shai-lfc cameo — no human character)
        // Tax4US mascot: animated gold coin with navy top hat + lime green glasses
        // Brand colors: #06162F (dark navy), #A1CD3A (lime green), #FFCD57 (gold)
        try {
            pipelineLogger.info("Video model: kling-3.0 with coin mascot (primary)", "KIE_AI");

            const shots = this.buildSoraStoryboard(params.title, params.excerpt);

            const response = await this.fetchWithRetry(`${this.baseUrl}/jobs/createTask`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "sora-2-pro-storyboard",
                    input: {
                        n_frames: "25",
                        aspect_ratio: "portrait",
                        upload_method: "s3",
                        shots: shots
                    }
                })
            });

            if (response?.ok) {
                const data = await response.json();
                const taskId = data.data?.taskId || data.taskId;
                if (taskId) {
                    pipelineLogger.info(`Sora task ID: ${taskId}`, "KIE_AI");
                    return taskId;
                }
            }

            pipelineLogger.warn("Sora failed or no taskId. Falling back to Observatory model...", "KIE_AI");
        } catch (soraErr: any) {
            pipelineLogger.warn(`Sora error: ${soraErr.message}. Falling back to Observatory...`, "KIE_AI");
        }

        // FALLBACK: Observatory model selection (Kling 3.0, Veo 3.1, etc.)
        try {
            const videoRec = await this.getModelRecommendation("video_clip_generation", "kling-3.0/video");
            pipelineLogger.info(`Fallback video model: ${videoRec.model}`, "KIE_AI");

            const prompt = `STYLIZED ILLUSTRATED animated gold coin mascot character with dark navy top hat and lime green glasses, in a surreal creative setting. The coin character confidently presents about "${params.title}". Motion graphics illustration style, bold clean lines, flat colors. Brand colors: dark navy #06162F, lime green #A1CD3A, gold #FFCD57. NOT photorealistic. Vertical 9:16.`;

            const response = await this.fetchWithRetry(`${this.baseUrl}${videoRec.endpoint.replace('/api/v1', '')}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: videoRec.model,
                    input: { prompt, mode: "std", aspect_ratio: "9:16", duration: "8s" }
                })
            });

            if (response?.ok) {
                const data = await response.json();
                const taskId = data.data?.taskId || data.taskId;
                if (taskId) {
                    pipelineLogger.info(`Fallback task ID: ${taskId}`, "KIE_AI");
                    return taskId;
                }
            }

            pipelineLogger.warn("Fallback video also failed. Generating image instead...", "KIE_AI");
            return await this.generateImage(`Professional infographic for: ${params.title}. ${params.excerpt}`);

        } catch (error: any) {
            pipelineLogger.error(`All video generation failed: ${error.message}. Image fallback...`);
            return await this.generateImage(`Professional infographic for: ${params.title}. ${params.excerpt}`);
        }
    }

    /**
     * Build Sora storyboard shots for Tax4US reel
     * 25 seconds total, 5 shots, coin mascot throughout (NO human character)
     * Brand colors: #06162F (dark navy), #A1CD3A (lime green), #FFCD57 (gold)
     */
    private buildSoraStoryboard(title: string, excerpt: string): Array<{ Scene: string; duration: number }> {
        const shortExcerpt = excerpt.substring(0, 200).trim();
        return [
            {
                Scene: `Stylized illustrated animated gold coin mascot character with a dark navy top hat and lime green glasses stands confidently in a surreal setting. Bold clean lines, flat color blocks, motion graphics style. The coin character faces the viewer with a warm expression, ready to explain: "${title}". Dark navy (#06162F) and lime green (#A1CD3A) color accents. NOT photorealistic.`,
                duration: 6
            },
            {
                Scene: `The illustrated gold coin mascot gestures with one hand while explaining a key concept. Surreal background with floating financial symbols in dark navy and lime green. Motion graphics animation style, clean bold lines. Professional but creative atmosphere.`,
                duration: 5
            },
            {
                Scene: `Medium close-up of the gold coin mascot character pointing upward, making an important point. Lime green accent lighting. Bold illustrated style with geometric background elements in brand colors. Confident, trustworthy energy.`,
                duration: 5
            },
            {
                Scene: `The coin mascot character in a surreal setting — giant calculator keys or floating tax forms in the background. The character nods approvingly. Dark navy and gold color palette, illustrated motion graphics style.`,
                duration: 5
            },
            {
                Scene: `The gold coin mascot waves warmly at the viewer with a welcoming gesture. Clean white and lime green background. Professional, approachable, ready to help. Bold illustrated style, NOT photorealistic.`,
                duration: 4
            }
        ];
    }

    async generateImage(prompt: string) {
        // Only bypass if explicitly disabled
        if (process.env.DISABLE_KIE_AI === "true") {
            pipelineLogger.warn("Kie.ai image explicitly disabled", "KIE_AI");
            return "kie-image-disabled-placeholder";
        }

        pipelineLogger.agent(`Initiating Image generation for: "${prompt.substring(0, 50)}..."`, "KIE_AI");

        try {
            // Use nano-banana-pro directly (verified working on TAX4US Kie.ai account)
            // Observatory recommends seedream/4.5 which is NOT available on TAX4US tier
            const imageModel = "nano-banana-pro";
            pipelineLogger.info(`Image model: ${imageModel}`, "KIE_AI");

            const response = await fetch(`${this.baseUrl}/jobs/createTask`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: imageModel,
                    input: {
                        prompt: prompt,
                        aspect_ratio: "16:9"
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
        const rawState = (data.data?.state || data.state || "").toLowerCase();

        if (rawState === "success" || rawState === "completed") {
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
        } else if (rawState === "fail" || rawState === "failed") {
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
