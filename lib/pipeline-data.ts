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
    { id: "wp-501", titleHe: "מדריך FBAR שלם", titleEn: "Complete FBAR Guide", status: "published", date: "2024-02-10", category: "Compliance", hasVideo: true, hasFeaturedImage: true, translationStatus: "linked" }
];

export const mockSeoMetrics: SeoMetric[] = [
    { id: "seo-1", title: "FBAR Guide 2025", score: 92, keywordDensity: 1.8, wordCount: 2450, status: "good", trend: "up" }
];

export const mockPodcasts: PodcastEpisode[] = [
    { id: "pod-1", episodeNumber: 42, title: "Navigating Filing Season", status: "published", duration: "14:20", publishDate: "Feb 5, 2025", platformStatus: { elevenLabs: "done", captivate: "done", wordpress: "done" } }
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
        // 1. Fetch from Airtable (The Proposal/Ready queue)
        const airtableRecords = await airtable.getRecords(contentTable, { maxRecords: 10 });

        const items: PipelineItem[] = airtableRecords.map((rec: any) => ({
            id: rec.id,
            topic: rec.fields.topic || "Untitled Topic",
            stage: rec.fields.Status === 'Ready' ? 'hebrew-generation' : 'topic-selection',
            status: rec.fields.Status === 'Ready' ? 'pending' : 'waiting-approval',
            category: rec.fields.Category || "Tax",
            lastUpdated: new Date(rec.createdTime).toLocaleDateString(),
            gates: {
                topicApproved: rec.fields.Status === 'Ready',
                hebrewContentApproved: false,
                videoApproved: false,
                linkedinApproved: false,
                facebookApproved: false
            }
        }));

        // 2. Fetch from WordPress (The Published/Draft pipeline)
        const wpPosts = await wp.getPosts({ status: 'any', per_page: '10' });
        const wpItems: PipelineItem[] = wpPosts.map((post: any) => ({
            id: post.id.toString(),
            topic: post.title.rendered,
            stage: post.status === 'publish' ? 'english-publish-social' : 'hebrew-publish',
            status: post.status === 'publish' ? 'completed' : 'in-progress',
            category: "WP Post",
            lastUpdated: new Date(post.modified).toLocaleDateString(),
            gates: {
                topicApproved: true,
                hebrewContentApproved: true,
                videoApproved: !!post.meta?.kie_video_url,
                linkedinApproved: post.status === 'publish',
                facebookApproved: post.status === 'publish'
            }
        }));

        return [...items, ...wpItems];
    } catch (e) {
        console.error("Pipeline Fetch Error:", e);
        return mockPipelineItems;
    }
}

export async function fetchInventory(): Promise<InventoryItem[]> {
    const wp = new WordPressClient();
    try {
        const posts = await wp.getPosts({ status: 'any', per_page: '20' });
        return posts.map((p: any) => ({
            id: p.id.toString(),
            titleHe: p.title.rendered,
            titleEn: p.meta?.en_title || undefined,
            status: p.status as any,
            date: new Date(p.date).toLocaleDateString(),
            category: "Tax",
            hasVideo: !!p.meta?.kie_video_url,
            hasFeaturedImage: !!p.featured_media,
            translationStatus: p.meta?.en_link ? "linked" : "missing",
            url: p.link
        }));
    } catch (e) {
        return mockInventory;
    }
}

export async function fetchSeoMetrics(): Promise<SeoMetric[]> {
    const wp = new WordPressClient();
    try {
        const posts = await wp.getPosts({ status: 'publish', per_page: '20' });
        return posts.map((p: any) => {
            const score = parseInt(p.meta?.rank_math_seo_score || "0");
            return {
                id: p.id.toString(),
                title: p.title.rendered,
                score,
                keywordDensity: 1.5, // Calc simplified
                wordCount: p.content.rendered.split(/\s+/).length,
                status: score > 80 ? "good" : score > 50 ? "ok" : "bad",
                trend: "flat"
            };
        });
    } catch (e) {
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
            publishDate: ep.date,
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
