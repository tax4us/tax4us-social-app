export class CaptivateClient {
    private apiKey: string;
    private userId: string;
    private baseUrl: string = "https://api.captivate.fm";

    constructor() {
        this.apiKey = process.env.CAPTIVATE_API_KEY || "";
        this.userId = process.env.CAPTIVATE_USER_ID || "";
    }

    async uploadEpisode(audioBuffer: ArrayBuffer, metadata: { title: string; summary: string }) {
        // Captivate.fm API requires authentication and multi-part upload
        // This is a simplified implementation based on their public API docs
        const formData = new FormData();
        formData.append("file", new Blob([audioBuffer]), "episode.mp3");
        formData.append("title", metadata.title);
        formData.append("shownotes", metadata.summary);

        const response = await fetch(`${this.baseUrl}/episodes`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Captivate API Error: ${JSON.stringify(error)}`);
        }

        return await response.json();
    }
}
