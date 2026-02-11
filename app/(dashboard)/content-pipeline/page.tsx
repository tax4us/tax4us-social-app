import React from "react";
import {
    fetchPipelineStatus,
    fetchInventory,
    fetchSeoMetrics,
    fetchPodcasts,
    fetchServicesStatus,
    mockApprovals,
    ApprovalItem
} from "@/lib/pipeline-data";
import { fetchRecentMedia } from "@/lib/services/intelligence";

import { PipelineKanban } from "@/components/pipeline/PipelineKanban";
import { ContentInventoryGrid } from "@/components/pipeline/ContentInventoryGrid";
import { SeoScoreCharts } from "@/components/pipeline/SeoScoreCharts";
import { ApprovalCenter } from "@/components/pipeline/ApprovalCenter";
import { MediaLab } from "@/components/pipeline/MediaLab";
import { PodcastStudio } from "@/components/pipeline/PodcastStudio";

import { AirtableClient } from "@/lib/clients/airtable-client";

export const dynamic = 'force-dynamic';

export default async function ContentPipelinePage() {
    // 1. Fetch live data from our unified layer
    const [
        pipelineItems,
        inventoryResult,
        seoMetrics,
        podcasts,
        services,
        mediaItems
    ] = await Promise.all([
        fetchPipelineStatus(),
        fetchInventory(),
        fetchSeoMetrics(),
        fetchPodcasts(),
        fetchServicesStatus(),
        fetchRecentMedia()
    ]);

    const inventoryItems = inventoryResult.items;

    // 2. Fetch specific Approvals from Airtable
    const airtable = new AirtableClient();
    let approvals: ApprovalItem[] = mockApprovals;
    try {
        const approvalRecords = await airtable.getRecords("tblq7MDqeogrsdInc", {
            filterByFormula: "OR({Status} = 'Review', {Status} = 'Waiting Approval')"
        });

        if (approvalRecords.length > 0) {
            approvals = approvalRecords.map((r: any) => ({
                id: r.id,
                type: 'article',
                title: r.fields["Title EN"] || r.fields.topic || "Untitled Topic",
                submittedAt: r.fields["Last Modified"] ? new Date(r.fields["Last Modified"]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently",
                summary: r.fields.topic,
                contentSnippet: r.fields.title
            }));
        }
    } catch (e) {
        console.error("Failed to fetch approvals:", e);
    }


    return (
        <div className="p-6 h-[calc(100vh-4rem)] flex flex-col gap-4 max-w-[1920px] mx-auto overflow-y-auto">

            {/* Header */}
            <div className="flex-none">
                <h1 className="text-3xl font-bold font-heading text-primary">Content Pipeline</h1>
                <p className="text-muted-foreground">Track your articles from idea to published — all in one place.</p>
            </div>



            {/* Main Grid Layout */}
            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">

                {/* Left Col: Pipeline & Inventory (Width: 8/12) */}
                <div className="col-span-8 flex flex-col gap-6 h-full overflow-hidden">

                    {/* Top: Kanban (Height: 45%) */}
                    <div className="h-[45%] bg-card rounded-2xl border border-border shadow-sm p-4 overflow-hidden">
                        <PipelineKanban items={pipelineItems} />
                    </div>

                    {/* Bottom: Split Inventory & SEO (Height: 55%) */}
                    <div className="h-[55%] grid grid-cols-2 gap-6">
                        <div className="bg-card rounded-2xl border border-border shadow-sm p-4 overflow-hidden">
                            <ContentInventoryGrid items={inventoryItems} />
                        </div>
                        <div className="bg-card rounded-2xl border border-border shadow-sm p-4 overflow-hidden">
                            <SeoScoreCharts metrics={seoMetrics} />
                        </div>
                    </div>
                </div>

                {/* Right Col: Approvals & Operations (Width: 4/12) */}
                <div className="col-span-4 flex flex-col gap-6 h-full overflow-y-auto pr-1">

                    {/* Approval Queue (Priority) */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm p-4 max-h-[400px] overflow-hidden">
                        <ApprovalCenter items={approvals} />
                    </div>

                    {/* Operational Metrics Grid */}
                    <div className="grid grid-cols-1 gap-6">
                        {/* Media Lab */}
                        <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
                            <MediaLab items={mediaItems} />
                        </div>

                        {/* Podcast Studio */}
                        <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
                            <PodcastStudio episodes={podcasts} />
                        </div>


                    </div>
                </div>

            </div>
        </div>
    );
}
