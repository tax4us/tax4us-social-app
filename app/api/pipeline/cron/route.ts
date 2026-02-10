import { NextResponse } from "next/server";
import { PipelineOrchestrator } from "@/lib/pipeline/orchestrator";

export const maxDuration = 300; // 5 minutes max for Vercel functions (Pro)
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    // 1. Verify Authentication (Simple Bearer Token or Vercel Cron Header)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (
        !process.env.VERCEL_CRON_HEADER && // Allow Vercel internal trigger
        authHeader !== `Bearer ${cronSecret}`
    ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type") || "content";

        console.log(`Cron triggered: Running Pipeline AutoPilot (${type})...`);
        const orchestrator = new PipelineOrchestrator();

        if (type === "seo") {
            await orchestrator.runSEOAutoPilot();
        } else {
            // Default: New content pipeline
            await orchestrator.runAutoPilot();
        }

        return NextResponse.json({ success: true, message: `Pipeline (${type}) executed successfully.` });
    } catch (error: any) {
        console.error("Cron failed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
