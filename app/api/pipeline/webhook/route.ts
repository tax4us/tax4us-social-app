import { NextRequest, NextResponse } from 'next/server';
import { updatePipelineItem, updateN8nState } from '@/lib/n8n-bridge';

// Endpoint for N8N to push updates
// POST /api/pipeline/webhook
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Determine update type based on payload
        // Expecting: { type: 'pipeline_item', data: ... } or just inferred structure

        if (body.type === 'pipeline_item' || body.stage) {
            // Assume proper PipelineItem structure or map it
            await updatePipelineItem(body);
            return NextResponse.json({ success: true, message: "Pipeline item updated" });
        }

        if (body.type === 'bulk_update') {
            const { pipelineItems, mediaGenerations, podcastEpisodes } = body;
            await updateN8nState({
                ...(pipelineItems && { pipelineItems }),
                ...(mediaGenerations && { mediaGenerations }),
                ...(podcastEpisodes && { podcastEpisodes })
            });
            return NextResponse.json({ success: true, message: "Bulk state updated" });
        }

        return NextResponse.json({ success: false, message: "Unknown payload type" }, { status: 400 });

    } catch (error) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
