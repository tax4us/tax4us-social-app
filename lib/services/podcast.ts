import { PodcastEpisode } from "@/lib/pipeline-data";

const CAPTIVATE_API_BASE = "https://api.captivate.fm";
const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

interface CaptivateAuthResponse {
    user: {
        token: string;
        id: string;
        // other fields
    };
}

interface CaptivateShowResponse {
    shows: Array<{
        id: string;
        title: string;
        // other fields
    }>;
}

interface CaptivateEpisode {
    id: string;
    title: string;
    published_date: string;
    status: string;
    season: string;
    episode_number: string; // API returns snake_case
    duration: number;
}

interface ElevenLabsHistoryItem {
    history_item_id: string;
    request_id: string;
    voice_id: string;
    text: string;
    date_unix: number;
    character_count_change_from: number;
    character_count_change_to: number;
    content_type: string;
    state: string; // 'created', 'deleted', 'processing'?
}

export class PodcastService {
    /**
     * Authenticaties with Captivate to get a session token.
     * Uses 2-step auth: POST /authenticate/token with username (ID) & API Key.
     */
    private async getCaptivateToken(): Promise<string | null> {
        try {
            const username = process.env.CAPTIVATE_USER_ID; // The ID "655c..."
            const token = process.env.CAPTIVATE_API_KEY;    // The key "yuli..."

            if (!username || !token) {
                console.error("Missing Captivate credentials");
                return null;
            }

            const params = new URLSearchParams();
            params.append('username', username);
            params.append('token', token);

            const response = await fetch(`${CAPTIVATE_API_BASE}/authenticate/token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: params,
                next: { revalidate: 3600 } // Cache token for 1 hour
            });

            if (!response.ok) {
                console.error(`Captivate Auth Failed: ${response.status} ${response.statusText}`);
                return null;
            }

            const data: CaptivateAuthResponse = await response.json();
            return data.user.token;
        } catch (error) {
            console.error("Error authenticating with Captivate:", error);
            return null;
        }
    }

    async fetchPodcastEpisodes(): Promise<PodcastEpisode[]> {
        const items: PodcastEpisode[] = [];

        // 1. Fetch from Captivate
        try {
            const token = await this.getCaptivateToken();
            if (token) {
                const userId = process.env.CAPTIVATE_USER_ID;

                // Get Shows
                const showsResponse = await fetch(`${CAPTIVATE_API_BASE}/users/${userId}/shows`, {
                    headers: { "Authorization": `Bearer ${token}` },
                    next: { revalidate: 300 }
                });

                if (showsResponse.ok) {
                    const showsData: CaptivateShowResponse = await showsResponse.json();
                    const showId = showsData.shows?.[0]?.id;

                    if (showId) {
                        // Get Episodes
                        const episodesResponse = await fetch(`${CAPTIVATE_API_BASE}/shows/${showId}/episodes`, {
                            headers: { "Authorization": `Bearer ${token}` },
                            next: { revalidate: 300 }
                        });

                        if (episodesResponse.ok) {
                            const data = await episodesResponse.json();
                            const episodes: CaptivateEpisode[] = Array.isArray(data.episodes) ? data.episodes : [];

                            items.push(...episodes.map((ep) => ({
                                id: `pod-${ep.id}`,
                                title: ep.title,
                                status: (ep.status === "published" ? "published" : "scripting"),
                                episodeNumber: Number(ep.episode_number) || 0,
                                duration: this.formatDuration(ep.duration),
                                publishDate: ep.published_date ? new Date(ep.published_date).toLocaleDateString('en-GB') : undefined,
                                rawDate: ep.published_date || new Date().toISOString(),
                                platformStatus: {
                                    elevenLabs: "done",
                                    captivate: ep.status === "published" ? "done" : "processing",
                                    wordpress: "done"
                                }
                            } as PodcastEpisode)));
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching Captivate episodes:", error);
        }

        // 2. Fetch from ElevenLabs (History)
        try {
            if (process.env.ELEVENLABS_API_KEY) {
                const response = await fetch(`${ELEVENLABS_API_BASE}/history?page_size=5`, {
                    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
                    next: { revalidate: 300 }
                });

                if (response.ok) {
                    const data = await response.json();
                    const history = (data.history || []) as ElevenLabsHistoryItem[];

                    // Avoid duplicates if possible (simple ID check won't work across services easily, 
                    // but ElevenLabs items are "synthesis" candidates usually)
                    // We add them as "synthesis" status items
                    items.push(...history.map((item) => ({
                        id: `xi-${item.history_item_id}`,
                        episodeNumber: 0,
                        title: (item.text || "Untitled Voice Generation").substring(0, 40) + "...",
                        status: "synthesis",
                        duration: "--:--",
                        publishDate: new Date(item.date_unix * 1000).toLocaleDateString('en-GB'),
                        rawDate: new Date(item.date_unix * 1000).toISOString(),
                        platformStatus: {
                            elevenLabs: "processing",
                            captivate: "pending",
                            wordpress: "pending"
                        }
                    } as PodcastEpisode)));
                }
            }
        } catch (error) {
            console.error("Error fetching ElevenLabs history:", error);
        }

        // Sort by publishDate/date desc
        // Note: ElevenLabs items store date in 'updatedAt' which isn't on the official interface, 
        // but we can sort by logic or just return as is. 
        // The interface has `publishDate` which is optional.
        return items;
    }

    private formatDuration(seconds: number): string {
        if (!seconds) return "00:00";
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    }
}


export const podcastService = new PodcastService();
export const fetchPodcastEpisodes = () => podcastService.fetchPodcastEpisodes();

