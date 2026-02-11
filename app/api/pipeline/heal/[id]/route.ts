import { NextRequest, NextResponse } from "next/server";
import { PipelineOrchestrator } from "@/lib/pipeline/orchestrator";
import { pipelineLogger } from "@/lib/pipeline/logger";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;
    const postId = parseInt(id);
    if (isNaN(postId)) {
        return NextResponse.json({ error: "Invalid Post ID" }, { status: 400 });
    }

    try {
        const orchestrator = new PipelineOrchestrator();
        pipelineLogger.info(`API: Manual Heal trigger for post ${postId}`);

        const result = await orchestrator.heal(postId);

        return NextResponse.json(result);
    } catch (error: any) {
        pipelineLogger.error(`API: Heal failed for post ${postId}: ${error.message}`);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
