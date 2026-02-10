import { NextRequest, NextResponse } from "next/server";
import { pipelineLogger } from "@/lib/pipeline/logger";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get("topicId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");

    const logs = pipelineLogger.getLogs(topicId, limit);

    return NextResponse.json({ logs });
}
