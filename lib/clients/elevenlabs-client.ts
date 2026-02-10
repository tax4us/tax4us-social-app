export class ElevenLabsClient {
    private apiKey: string;
    private voiceId: string;
    private baseUrl: string = "https://api.elevenlabs.io/v1";

    constructor() {
        this.apiKey = process.env.ELEVENLABS_API_KEY || "";
        this.voiceId = process.env.ELEVENLABS_VOICE_ID || "";
        if (!this.apiKey) {
            throw new Error("Missing ELEVENLABS_API_KEY in environment variables.");
        }
    }

    async generateSpeech(text: string): Promise<ArrayBuffer> {
        const response = await fetch(`${this.baseUrl}/text-to-speech/${this.voiceId}`, {
            method: "POST",
            headers: {
                "xi-api-key": this.apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                text,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`ElevenLabs API Error: ${JSON.stringify(error)}`);
        }

        return await response.arrayBuffer();
    }
}
