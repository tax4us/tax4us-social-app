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
    private authErrorLogged = false;
    private authFailed = false;
    private lastAuthAttempt = 0;

    async fetchPodcastEpisodes(): Promise<PodcastEpisode[]> {
        const items: PodcastEpisode[] = [];

        // In development, skip external API calls and return fallback data
        if (process.env.NODE_ENV === 'development') {
            return this.getFallbackEpisodes();
        }

        // Check if credentials exist before attempting auth
        const username = process.env.CAPTIVATE_USER_ID;
        const apiKey = process.env.CAPTIVATE_API_KEY;

        if (!username || !apiKey) {
            return this.getFallbackEpisodes();
        }

        // 1. Return fallback data since Captivate auth is disabled
        // Captivate integration disabled - credentials need refresh

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

    private getFallbackEpisodes(): PodcastEpisode[] {
        return [
            {
                id: "demo_episode_1",
                title: "FBAR Filing Requirements for Israeli-Americans",
                publishDate: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days ago
                status: "published",
                duration: "12:45",
                episodeNumber: 1,
                rawDate: new Date(Date.now() - 86400000 * 7).toISOString(),
                platformStatus: {
                    elevenLabs: "done",
                    captivate: "done",
                    wordpress: "done"
                }
            },
            {
                id: "demo_episode_2", 
                title: "US-Israel Tax Treaty Benefits Explained",
                publishDate: new Date(Date.now() - 86400000 * 14).toISOString(), // 14 days ago
                status: "published",
                duration: "15:30",
                episodeNumber: 2,
                rawDate: new Date(Date.now() - 86400000 * 14).toISOString(),
                platformStatus: {
                    elevenLabs: "done",
                    captivate: "done",
                    wordpress: "done"
                }
            }
        ];
    }
}


export const podcastService = new PodcastService();
export const fetchPodcastEpisodes = () => podcastService.fetchPodcastEpisodes();

