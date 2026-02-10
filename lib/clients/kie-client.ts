export class KieClient {
    private apiKey: string;
    private baseUrl: string = "https://api.kie.ai/api/v1";

    constructor() {
        this.apiKey = process.env.KIE_AI_API_KEY || "";
        if (!this.apiKey) {
            throw new Error("Missing KIE_AI_API_KEY in environment variables.");
        }
    }

    async createImage(prompt: string, options: any = {}) {
        // Assuming standard image generation endpoint if not specifically 'veo'
        const response = await fetch(`${this.baseUrl}/jobs/createTask`, {
            method: "POST",
            headers: {
                "x-api-key": this.apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                taskType: "image_gen",
                prompt,
                ...options,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Kie.ai API Error: ${JSON.stringify(error)}`);
        }

        return await response.json();
    }

    async createVideo(prompt: string, options: any = {}) {
        const response = await fetch(`${this.baseUrl}/veo/generate`, {
            method: "POST",
            headers: {
                "x-api-key": this.apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                prompt,
                ...options,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Kie.ai API Error: ${JSON.stringify(error)}`);
        }

        return await response.json();
    }

    async getJobStatus(taskId: string) {
        const response = await fetch(`${this.baseUrl}/jobs/recordInfo?taskId=${taskId}`, {
            headers: {
                "x-api-key": this.apiKey,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Kie.ai API Error: ${JSON.stringify(error)}`);
        }

        return await response.json();
    }
}
