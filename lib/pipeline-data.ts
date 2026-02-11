import { LucideIcon, FileText, CheckCircle, Clock, AlertTriangle, Video, Mic, Instagram, Linkedin, Facebook } from "lucide-react";

// --- Types ---

export type PipelineStage =
    | "topic-selection"
    | "hebrew-generation"
    | "wp-draft-video"
    | "hebrew-publish"
    | "english-publish-social";

export type Status = "pending" | "in-progress" | "completed" | "failed" | "waiting-approval";

export interface PipelineItem {
    id: string;
    topic: string;
    stage: PipelineStage;
    status: Status;
    category: string;
    lastUpdated: string;
    url?: string;
    error?: string;
    gates: {
        topicApproved: boolean;
        hebrewContentApproved: boolean;
        videoApproved: boolean;
        linkedinApproved: boolean;
        facebookApproved: boolean;
    };
}

export interface InventoryItem {
    id: string;
    titleHe: string;
    titleEn?: string;
    status: "published" | "draft" | "scheduled";
    date: string;
    category: string;
    hasVideo: boolean;
    hasFeaturedImage: boolean;
    translationStatus: "linked" | "missing" | "pending";
    url?: string; // Live WordPress link
    rawDate: string; // ISO string for sorting
}

export interface SeoMetric {
    id: string;
    title: string;
    score: number;
    keywordDensity: number;
    wordCount: number;
    status: "good" | "ok" | "bad";
    trend: "up" | "down" | "flat";
}

export interface ApprovalItem {
    id: string;
    type: "topic" | "article" | "video" | "social-linkedin" | "social-facebook" | "seo";
    title: string;
    submittedAt: string;
    summary?: string;
    previewUrl?: string; // For videos/images
    contentSnippet?: string; // For text
}

export interface MediaGeneration {
    id: string;
    type: "veo3-banner" | "nano-featured" | "sora-social";
    status: "generating" | "completed" | "failed";
    prompt: string;
    duration?: number; // seconds
    startTime: string;
    model: string;
    cost: number;
    previewUrl?: string;
}

export interface PodcastEpisode {
    id: string;
    episodeNumber: number;
    title: string;
    status: "scripting" | "synthesis" | "concatenating" | "uploading" | "published";
    duration: string;
    publishDate?: string;
    rawDate: string; // ISO string for sorting
    url?: string; // Direct share link
    platformLinks?: {
        apple?: string;
        spotify?: string;
    };
    platformStatus: {
        elevenLabs: "done" | "processing" | "pending";
        captivate: "done" | "processing" | "pending";
        wordpress: "done" | "processing" | "pending";
    };
}

export interface SystemService {
    id: string;
    name: string;
    status: "operational" | "degraded" | "outage";
    latency: number;
    uptime: number;
}

// --- Real Data Fetchers (Server-Side) ---

import { AirtableClient } from "./clients/airtable-client";
import { WordPressClient } from "./clients/wordpress-client";
import { CaptivateClient } from "./clients/captivate-client";

// --- Mock Data (Fallbacks for UI) ---

export const mockPipelineItems: PipelineItem[] = [
    {
        id: "run-101",
        topic: "FBAR Filing Deadlines 2025",
        stage: "english-publish-social",
        status: "in-progress",
        category: "Compliance",
        lastUpdated: "10 mins ago",
        gates: { topicApproved: true, hebrewContentApproved: true, videoApproved: true, linkedinApproved: true, facebookApproved: false }
    }
];

export const mockInventory: InventoryItem[] = [
    { id: "wp-501", titleHe: "מדריך FBAR שלם", titleEn: "Complete FBAR Guide", status: "published", date: "2024-02-10", category: "Compliance", hasVideo: true, hasFeaturedImage: true, translationStatus: "linked", rawDate: "2024-02-10" }
];

export const mockSeoMetrics: SeoMetric[] = [
    { id: "seo-1", title: "FBAR Guide 2025", score: 92, keywordDensity: 1.8, wordCount: 2450, status: "good", trend: "up" }
];

export const mockPodcasts: PodcastEpisode[] = [
    { id: "pod-1", episodeNumber: 42, title: "Navigating Filing Season", status: "published", duration: "14:20", publishDate: "Feb 5, 2025", rawDate: "2025-02-05", platformStatus: { elevenLabs: "done", captivate: "done", wordpress: "done" } }
];

export const mockServices: SystemService[] = [
    { id: "wp", name: "WordPress", status: "operational", latency: 120, uptime: 99.9 }
];

export const mockApprovals: ApprovalItem[] = [
    { id: "app-1", type: "topic", title: "Digital Nomad Tax", submittedAt: "10:30 AM", summary: "Focus on Social Security." }
];

export const mockMedia: MediaGeneration[] = [
    { id: "gen-1", type: "sora-social", status: "completed", prompt: "Accountant explaining tax", duration: 15, startTime: "10:00 AM", model: "sora-2", cost: 0.85 }
];

export async function fetchPipelineStatus(): Promise<PipelineItem[]> {
    const airtable = new AirtableClient();
    const wp = new WordPressClient();
    const contentTable = "tblq7MDqeogrsdInc";

    try {
        // 1. Parallel Fetch from Airtable and WordPress
        const [airtableRecords, wpPosts] = await Promise.all([
            airtable.getRecords(contentTable, { maxRecords: 100 }).catch(() => []),
            wp.getPosts({ status: 'publish', per_page: '20' }).catch(() => [])
        ]);

        const items: PipelineItem[] = airtableRecords
            .map((rec: any) => {
                const fields = rec.fields;
                const topic = fields.topic || fields.Topic || fields.title || fields.Title || fields["Title EN"] || "";
                const rawStatus = fields.Status || fields.status || "";
                const isReady = rawStatus === 'Ready' || rawStatus === 'ready';
                const isPublished = rawStatus === 'Published' || rawStatus === 'published' || rawStatus === 'publish';

                return {
                    id: rec.id,
                    topic: topic.trim(),
                    stage: isReady ? 'hebrew-generation' : (isPublished ? 'english-publish-social' : 'topic-selection'),
                    status: isReady ? 'pending' : (isPublished ? 'completed' : 'waiting-approval'),
                    category: fields.Category || fields.category || "Tax",
                    lastUpdated: new Date(rec.createdTime).toLocaleDateString(),
                    url: fields.url || fields.URL || fields["Public URL"] || fields["Share Link"] || undefined,
                    gates: {
                        topicApproved: isReady || isPublished,
                        hebrewContentApproved: isPublished,
                        videoApproved: isPublished,
                        linkedinApproved: isPublished,
                        facebookApproved: isPublished
                    }
                } as PipelineItem;
            })
            // Filter out empty or "Untitled" topics
            .filter((item: PipelineItem) => item.topic && item.topic.toLowerCase() !== "untitled topic" && item.topic.length > 3);

        // Deduplicate by title (keep newest)
        const seen = new Set();
        const dedupedItems = items.filter(item => {
            const duplicate = seen.has(item.topic.toLowerCase());
            seen.add(item.topic.toLowerCase());
            return !duplicate;
        });

        // 2. Map WordPress posts to PipelineItems
        const wpItems: PipelineItem[] = Array.isArray(wpPosts) ? wpPosts.map((post: any) => ({
            id: post.id.toString(),
            topic: post.title?.rendered || "Unknown Post",
            stage: post.status === 'publish' ? 'english-publish-social' : 'hebrew-publish',
            status: post.status === 'publish' ? 'completed' : 'in-progress',
            category: "WP Post",
            lastUpdated: new Date(post.modified).toLocaleDateString(),
            url: post.link,
            gates: {
                topicApproved: true,
                hebrewContentApproved: true,
                videoApproved: !!post.meta?.kie_video_url,
                linkedinApproved: post.status === 'publish',
                facebookApproved: post.status === 'publish'
            }
        })) : [];

        // Return a combined list, but sliced to a reasonable dashboard view
        return [...dedupedItems, ...wpItems].slice(0, 30);
    } catch (e) {
        console.error("Pipeline Fetch Error:", e);
        return mockPipelineItems;
    }
}

export async function fetchInventory(): Promise<{ items: InventoryItem[], total: number }> {
    const wp = new WordPressClient();
    try {
        // Only fetch fields we need — no _embed (huge payload), limit to 30 posts
        const query = new URLSearchParams({
            status: 'publish',
            per_page: '30',
            _fields: 'id,title,status,date,link,featured_media,meta'
        }).toString();
        const url = `${(wp as any).baseUrl}/posts?${query}`;

        const response = await fetch(url, {
            headers: (wp as any).auth ? { "Authorization": `Basic ${(wp as any).auth}` } : {},
            signal: AbortSignal.timeout(4000)
        });

        if (!response.ok) {
            return { items: mockInventory, total: mockInventory.length };
        }

        const total = parseInt(response.headers.get("x-wp-total") || "0", 10);
        const posts = await response.json();

        if (!posts || !Array.isArray(posts)) {
            return { items: mockInventory, total: mockInventory.length };
        }

        const items = posts.map((p: any) => ({
            id: p.id.toString(),
            titleHe: p.title?.rendered || "Unknown Title",
            titleEn: p.meta?.en_title || undefined,
            status: (p.status === 'publish' ? 'published' : p.status === 'future' ? 'scheduled' : 'draft') as any,
            date: new Date(p.date).toLocaleDateString('en-GB'),
            category: "Tax",
            hasVideo: !!p.meta?.kie_video_url,
            hasFeaturedImage: !!p.featured_media,
            translationStatus: (p.meta?.en_link ? "linked" : "missing") as "linked" | "missing" | "pending",
            url: p.link,
            rawDate: p.date
        }));

        return { items, total };
    } catch (e) {
        console.error("Inventory Fetch Error:", e);
        return { items: mockInventory, total: mockInventory.length };
    }
}

export async function fetchSeoMetrics(): Promise<SeoMetric[]> {
    const wp = new WordPressClient();
    try {
        const posts = await wp.getPosts({ status: 'publish', per_page: '50' });
        return posts.map((p: any) => {
            const score = parseInt(p.meta?.rank_math_seo_score || "0");
            return {
                id: p.id.toString(),
                title: p.title.rendered,
                score,
                keywordDensity: 1.5,
                wordCount: p.content.rendered.split(/\s+/).length,
                status: score > 80 ? "good" : score > 50 ? "ok" : "bad",
                trend: "flat"
            };
        });
    } catch (e) {
        console.error("SEO Metrics Fetch Error:", e);
        return mockSeoMetrics;
    }
}

export async function fetchPodcasts(): Promise<PodcastEpisode[]> {
    const captivate = new CaptivateClient();
    const showId = "45191a59-cf43-4867-83e7-cc2de0c5e780";
    try {
        const episodes = await captivate.getEpisodes(showId);
        return episodes.map((ep: any) => ({
            id: ep.id,
            episodeNumber: ep.episode_number,
            title: ep.title,
            status: ep.status === 'Published' ? 'published' : 'synthesis',
            duration: ep.duration || "0:00",
            publishDate: ep.date ? new Date(ep.date).toLocaleDateString('en-GB') : undefined,
            rawDate: ep.date || new Date().toISOString(),
            url: ep.share_link || `https://player.captivate.fm/episode/${ep.id}`,
            platformLinks: {
                spotify: ep.spotify_url || undefined,
                apple: ep.apple_url || undefined
            },
            platformStatus: {
                elevenLabs: "done",
                captivate: "done",
                wordpress: ep.status === 'Published' ? "done" : "pending"
            }
        }));
    } catch (e) {
        return mockPodcasts;
    }
}

export async function fetchServicesStatus(): Promise<SystemService[]> {
    return mockServices; // Keeping static for now, latency can be checked per client
}
