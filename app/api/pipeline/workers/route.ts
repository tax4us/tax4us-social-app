import { NextResponse } from "next/server";

/**
 * Workers API Route
 * Returns the current status of each pipeline worker based on day of week.
 */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface WorkerStatus {
    id: string;
    name: string;
    status: "idle" | "active" | "scheduled";
    scheduleDays: string[];
    lastRun?: string;
}

const WORKER_SCHEDULES: Record<string, number[]> = {
    "topic-manager": [1, 4],
    "content-generator": [1, 4],
    "gutenberg-builder": [1, 4],
    "translator": [1, 4],
    "media-processor": [1, 4],
    "social-publisher": [1, 4],
    "podcast-producer": [3],
    "seo-auditor": [2, 5],
    "data-healer": [],
};

const WORKER_NAMES: Record<string, string> = {
    "topic-manager": "Topic Manager",
    "content-generator": "Content Generator",
    "gutenberg-builder": "Gutenberg Builder",
    "translator": "Translator",
    "media-processor": "Media Processor",
    "social-publisher": "Social Publisher",
    "podcast-producer": "Podcast Producer",
    "seo-auditor": "SEO Auditor",
    "data-healer": "Data Auto-Healer",
};

export async function GET() {
    const currentDay = new Date().getDay();

    const workers: WorkerStatus[] = Object.entries(WORKER_SCHEDULES).map(([id, days]) => ({
        id,
        name: WORKER_NAMES[id] || id,
        status: days.includes(currentDay)
            ? "active" as const
            : days.some((d) => d > currentDay)
                ? "scheduled" as const
                : "idle" as const,
        scheduleDays: days.map((d) => DAYS[d]),
    }));

    return NextResponse.json({
        day: DAYS[currentDay],
        dayIndex: currentDay,
        activeCount: workers.filter((w) => w.status === "active").length,
        totalCount: workers.length,
        workers,
    });
}
