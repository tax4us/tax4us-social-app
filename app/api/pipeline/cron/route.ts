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
        console.log("Cron triggered: Running Pipeline AutoPilot...");
        const orchestrator = new PipelineOrchestrator();

        // This runs the pipeline for all "Ready" topics
        await orchestrator.runAutoPilot();

        return NextResponse.json({ success: true, message: "Pipeline executed successfully." });
    } catch (error: any) {
        console.error("Cron failed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
