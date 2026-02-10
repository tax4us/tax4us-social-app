"use client";

import React from "react";
import { MediaGeneration } from "@/lib/pipeline-data";
import { Video, Image as ImageIcon, Loader2 } from "lucide-react";

interface MediaLabProps {
    items: MediaGeneration[];
}

export function MediaLab({ items }: MediaLabProps) {
    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" />
                    Media Lab
                </h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {items.map((item) => (
                    <div key={item.id} className="flex gap-3 bg-muted/20 p-3 rounded-lg border border-border/50">
                        <div className={`w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0 border border-border/30
              ${item.status === 'generating' ? 'animate-pulse' : ''}
            `}>
                            {item.status === 'generating' ? (
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            ) : item.type.includes('video') ? (
                                <Video className="w-5 h-5 text-muted-foreground" />
                            ) : (
                                <ImageIcon className="w-5 h-5 text-muted-foreground" />
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-start">
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-primary">
                                    {item.model}
                                </h4>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize
                    ${item.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                                        item.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                                            'bg-blue-500/10 text-blue-500'}
                 `}>
                                    {item.status}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate my-1">
                                {item.prompt}
                            </p>
                            <div className="flex items-center gap-4 text-[10px] text-muted-foreground/70">
                                <span>Est. Cost: ${item.cost}</span>
                                <span>{item.startTime}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
