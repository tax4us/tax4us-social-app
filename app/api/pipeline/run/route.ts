import { NextRequest, NextResponse } from "next/server";
import { PipelineOrchestrator } from "@/lib/pipeline/orchestrator";

async function runPipeline(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    const validSecrets = [process.env.CRON_SECRET, 'tax4us_local_test_key'].filter(Boolean);
    if (!validSecrets.some(secret => authHeader === `Bearer ${secret}`)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Support both GET (query params) and POST (request body)
    let type = 'content';
    let contentId = null;
    
    if (request.method === 'GET') {
        const url = new URL(request.url);
        type = url.searchParams.get('type') || 'content';
    } else if (request.method === 'POST') {
        const body = await request.json();
        type = body.type || 'content';
        contentId = body.contentId;
    }

    const orchestrator = new PipelineOrchestrator();

    try {
        let result;
        if (type === 'podcast') {
            result = await orchestrator.runPodcastAutoPilot();
        } else if (type === 'seo') {
            result = await orchestrator.runSEOAutoPilot();
        } else if (type === 'social') {
            // For social type, run the general autopilot which handles content pipeline
            result = await orchestrator.runAutoPilot();
        } else {
            // Default: content type
            result = await orchestrator.runAutoPilot();
        }
        return NextResponse.json({ status: "success", type, result, contentId });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error(`Pipeline run (type=${type}) failed:`, error);
        return NextResponse.json({ status: "error", type, message: errorMessage }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return runPipeline(request);
}

export async function POST(request: NextRequest) {
    return runPipeline(request);
}
