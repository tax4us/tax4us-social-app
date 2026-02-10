"use client";

import React from "react";
import { PodcastEpisode } from "@/lib/pipeline-data";
import { Mic, Radio, CheckCircle2, Loader2 } from "lucide-react";

interface PodcastStudioProps {
    episodes: PodcastEpisode[];
}

export function PodcastStudio({ episodes }: PodcastStudioProps) {
    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Mic className="w-5 h-5 text-primary" />
                    Podcast Studio
                </h3>
            </div>

            <div className="space-y-3">
                {episodes.map((ep) => (
                    <div key={ep.id} className="bg-card p-4 rounded-xl border border-border/50 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Episode {ep.episodeNumber}</span>
                                <h4 className="font-medium text-sm">{ep.title}</h4>
                            </div>
                            <span className="text-xs font-mono bg-muted px-1.5 rounded">{ep.duration}</span>
                        </div>

                        {/* Pipeline Visualizer */}
                        <div className="flex items-center justify-between gap-2 mt-1 px-1">
                            {['elevenLabs', 'wordpress', 'captivate'].map((step, idx) => {
                                const status = ep.platformStatus[step as keyof typeof ep.platformStatus];
                                return (
                                    <React.Fragment key={step}>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border
                          ${status === 'done' ? 'bg-green-500 border-green-500 text-white' :
                                                    status === 'processing' ? 'bg-blue-100 border-blue-500 text-blue-500' :
                                                        'bg-muted border-border text-muted-foreground'}
                       `}>
                                                {status === 'done' ? <CheckCircle2 className="w-3 h-3" /> :
                                                    status === 'processing' ? <Loader2 className="w-3 h-3 animate-spin" /> :
                                                        <span className="w-2 h-2 bg-current rounded-full" />}
                                            </div>
                                            <span className="text-[10px] uppercase text-muted-foreground font-medium scale-90">
                                                {step === 'elevenLabs' ? 'Voice' : step === 'wordpress' ? 'Post' : 'RSS'}
                                            </span>
                                        </div>
                                        {idx < 2 && <div className={`h-0.5 flex-1 ${status === 'done' ? 'bg-green-500/50' : 'bg-muted'}`} />}
                                    </React.Fragment>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
