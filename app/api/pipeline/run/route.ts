import { NextResponse } from "next/server";
import { PipelineOrchestrator } from "@/lib/pipeline/orchestrator";

export async function GET(request: Request) {
    // Simple auth check for Cron job (can be improved with CRON_SECRET)
    const authHeader = request.headers.get("authorization");
    if (process.env.NODE_ENV === "production" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
    }

    const orchestrator = new PipelineOrchestrator();

    // We run it as a background task if possible, or just wait for it in a simple cron
    try {
        console.log("Cron job started: Running Tax4Us Pipeline...");
        await orchestrator.runAutoPilot();
        return NextResponse.json({ status: "success", message: "Pipeline executed successfully" });
    } catch (error: any) {
        console.error("Pipeline execution failed:", error);
        return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
    }
}
