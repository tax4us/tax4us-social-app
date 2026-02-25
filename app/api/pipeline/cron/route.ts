import { NextResponse } from "next/server";
import { PipelineOrchestrator } from "@/lib/pipeline/orchestrator";
import { db } from "@/lib/services/database";

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
        
        // Create pipeline run record
        const pipelineRun = await db.createPipelineRun({
            trigger_type: 'cron',
            pipeline_type: type === 'seo' ? 'seo_optimization' : 
                          type === 'podcast' ? 'podcast_production' : 'content_creation',
            status: 'running',
            current_stage: 'initialization',
            stages_completed: [],
            stages_failed: [],
            started_at: new Date().toISOString(),
            logs: [{
                timestamp: new Date().toISOString(),
                level: 'info',
                message: `Pipeline ${type} started via cron`,
                stage: 'initialization'
            }]
        });

        console.log(`Pipeline run created: ${pipelineRun.id}`);

        const orchestrator = new PipelineOrchestrator();

        try {
            // Update run status to processing
            await db.updatePipelineRun(pipelineRun.id, {
                status: 'running',
                current_stage: 'execution'
            });

            if (type === "seo") {
                await orchestrator.runSEOAutoPilot();
            } else if (type === "podcast") {
                await orchestrator.runPodcastAutoPilot();
            } else {
                await orchestrator.runAutoPilot();
            }

            // Mark as completed
            await db.updatePipelineRun(pipelineRun.id, {
                status: 'completed',
                current_stage: 'completed',
                stages_completed: ['initialization', 'execution'],
                completed_at: new Date().toISOString()
            });

            await db.addPipelineLog(pipelineRun.id, {
                timestamp: new Date().toISOString(),
                level: 'success',
                message: `Pipeline ${type} completed successfully`,
                stage: 'completed'
            });

            return NextResponse.json({ 
                success: true, 
                message: `Pipeline (${type}) executed successfully.`,
                run_id: pipelineRun.id
            });

        } catch (executionError: any) {
            // Mark as failed
            await db.updatePipelineRun(pipelineRun.id, {
                status: 'failed',
                current_stage: 'failed',
                stages_failed: ['execution'],
                completed_at: new Date().toISOString()
            });

            await db.addPipelineLog(pipelineRun.id, {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: `Pipeline execution failed: ${executionError.message}`,
                stage: 'execution'
            });

            throw executionError;
        }

    } catch (error: any) {
        console.error("Cron failed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
