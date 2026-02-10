export class CaptivateClient {
    private apiKey: string;
    private userId: string;
    private baseUrl: string = "https://api.captivate.fm";
    private bearerToken: string | null = null;

    constructor() {
        this.apiKey = process.env.CAPTIVATE_API_KEY || "";
        this.userId = process.env.CAPTIVATE_USER_ID || "";
    }

    private async authenticate() {
        if (this.bearerToken) return this.bearerToken;

        const FormData = require("form-data");
        const form = new FormData();
        form.append("username", this.userId);
        form.append("token", this.apiKey);

        const response = await fetch(`${this.baseUrl}/authenticate/token`, {
            method: "POST",
            headers: form.getHeaders(),
            body: form.getBuffer()
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Captivate Auth Failed [${response.status}]: ${errorText}`);
        }

        const data = JSON.parse(await response.text());
        this.bearerToken = data.user.token;
        return this.bearerToken;
    }

    async getShows() {
        const token = await this.authenticate();
        const response = await fetch(`${this.baseUrl}/shows`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) {
            const body = await response.text();
            console.error(`Failed to fetch shows: ${response.status} ${response.statusText}`, body);
            throw new Error(`Failed to fetch shows: ${response.status}`);
        }
        return await response.json();
    }

    async getEpisodes(showId: string) {
        const token = await this.authenticate();
        const response = await fetch(`${this.baseUrl}/shows/${showId}/episodes`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Failed to fetch episodes");
        const data = await response.json();
        // Handle variations in Captivate response structure
        return Array.isArray(data) ? data : (data.records || data.episodes || data.data || []);
    }

    async uploadMedia(showId: string, audioBuffer: Buffer, filename: string) {
        const token = await this.authenticate();
        const fs = require("fs");
        const path = require("path");
        const { execSync } = require("child_process");

        // Write buffer to a temporary file for curl
        const tmpFile = path.join("/tmp", `captivate-${Date.now()}.mp3`);
        fs.writeFileSync(tmpFile, audioBuffer);

        try {
            const cmd = `curl -X POST "${this.baseUrl}/shows/${showId}/media" \
                -H "Authorization: Bearer ${token}" \
                -H "User-Agent: curl/8.7.1" \
                -F "file=@${tmpFile}" \
                --silent --show-error`;

            const result = execSync(cmd).toString();
            fs.unlinkSync(tmpFile);

            try {
                return JSON.parse(result);
            } catch (e) {
                throw new Error(`Invalid JSON from Captivate curl upload: ${result}`);
            }
        } catch (error: any) {
            if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
            throw new Error(`Captivate Upload failed via curl: ${error.message}`);
        }
    }

    async createEpisode(data: {
        showId: string;
        title: string;
        mediaId: string;
        date: string;
        status: "Published" | "Draft";
        notes: string;
        season: number;
        episodeNumber: number;
    }) {
        const token = await this.authenticate();
        const FormData = require("form-data");
        const form = new FormData();

        form.append("shows_id", data.showId);
        form.append("title", data.title);
        form.append("media_id", data.mediaId);
        form.append("date", data.date);
        form.append("status", data.status);
        form.append("shownotes", data.notes);
        form.append("episode_season", data.season.toString());
        form.append("episode_number", data.episodeNumber.toString());

        const response = await fetch(`${this.baseUrl}/episodes`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                ...form.getHeaders()
            },
            body: form.getBuffer()
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Captivate Episode Creation Failed [${response.status}]: ${errorText}`);
        }

        return JSON.parse(await response.text());
    }

    async updateEpisode(episodeId: string, data: {
        showId: string;
        status?: "Published" | "Draft";
        date?: string;
        title?: string;
        shownotes?: string;
    }) {
        const token = await this.authenticate();
        const FormData = require("form-data");
        const form = new FormData();

        form.append("shows_id", data.showId);
        if (data.status) form.append("status", data.status);
        if (data.date) form.append("date", data.date);
        if (data.title) form.append("title", data.title);
        if (data.shownotes) form.append("shownotes", data.shownotes);

        const response = await fetch(`${this.baseUrl}/episodes/${episodeId}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                ...form.getHeaders()
            },
            body: form.getBuffer()
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Captivate Episode Update Failed [${response.status}]: ${errorText}`);
        }

        return JSON.parse(await response.text());
    }

    // Legacy method for compatibility if needed, but updated to use new flow
    async uploadEpisode(audioBuffer: ArrayBuffer, metadata: { title: string; summary: string }) {
        const showId = "45191a59-cf43-4867-83e7-cc2de0c5e780"; // Default show ID from n8n
        const media = await this.uploadMedia(showId, Buffer.from(audioBuffer), "episode.mp3") as any;
        return this.createEpisode({
            showId,
            title: metadata.title,
            mediaId: media.media?.id || media.id,
            date: new Date().toISOString().replace("T", " ").split(".")[0],
            status: "Draft",
            notes: metadata.summary,
            season: 1,
            episodeNumber: 0 // Will be calculated by producer
        });
    }
}
