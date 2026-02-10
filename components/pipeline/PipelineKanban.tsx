"use client";

import React from "react";
import { motion } from "framer-motion";
import { PipelineItem, PipelineStage } from "@/lib/pipeline-data";
import { FileText, MoreHorizontal, AlertCircle, CheckCircle2, Clock, PlayCircle } from "lucide-react";

interface PipelineKanbanProps {
    items: PipelineItem[];
}

const stages: { id: PipelineStage; label: string; color: string }[] = [
    { id: "topic-selection", label: "Topic", color: "bg-blue-500/10 text-blue-500 border-blue-200" },
    { id: "hebrew-generation", label: "Writing (HE)", color: "bg-purple-500/10 text-purple-500 border-purple-200" },
    { id: "wp-draft-video", label: "Media & Draft", color: "bg-orange-500/10 text-orange-500 border-orange-200" },
    { id: "hebrew-publish", label: "Publish (HE)", color: "bg-green-500/10 text-green-500 border-green-200" },
    { id: "english-publish-social", label: "Global & Social", color: "bg-indigo-500/10 text-indigo-500 border-indigo-200" },
];

export function PipelineKanban({ items }: PipelineKanbanProps) {
    const getItemsByStage = (stage: PipelineStage) => items.filter((i) => i.stage === stage);

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <PlayCircle className="w-5 h-5 text-primary" />
                    Live Pipeline Monitor
                </h3>
                <span className="text-xs text-muted-foreground">Real-time sync</span>
            </div>

            <div className="flex-1 grid grid-cols-5 gap-4 min-h-[300px]">
                {stages.map((stage) => (
                    <div key={stage.id} className="flex flex-col h-full bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
                        {/* Column Header */}
                        <div className={`px-3 py-2 border-b border-border/50 text-xs font-semibold uppercase tracking-wider flex justify-between items-center ${stage.color}`}>
                            {stage.label}
                            <span className="bg-background/50 px-1.5 rounded-full text-[10px]">{getItemsByStage(stage.id).length}</span>
                        </div>

                        {/* Column Body */}
                        <div className="p-2 flex-1 space-y-2 overflow-y-auto">
                            {getItemsByStage(stage.id).map((item) => (
                                <motion.div
                                    key={item.id}
                                    layoutId={item.id}
                                    className="bg-card p-3 rounded-lg border border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                                    whileHover={{ y: -2 }}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                            {item.category}
                                        </span>
                                        {item.status === "failed" ? (
                                            <AlertCircle className="w-4 h-4 text-red-500" />
                                        ) : item.status === "waiting-approval" ? (
                                            <Clock className="w-4 h-4 text-yellow-500" />
                                        ) : (
                                            <MoreHorizontal className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                        )}
                                    </div>

                                    <h4 className="text-sm font-medium leading-tight mb-2 line-clamp-2">{item.topic}</h4>

                                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/30">
                                        <span>{item.lastUpdated}</span>
                                        {item.status === "in-progress" && (
                                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
