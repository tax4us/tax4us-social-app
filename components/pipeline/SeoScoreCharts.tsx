"use client";

import React from "react";
import { SeoMetric } from "@/lib/pipeline-data";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

interface SeoScoreChartsProps {
    metrics: SeoMetric[];
}

export function SeoScoreCharts({ metrics }: SeoScoreChartsProps) {
    const averageScore = Math.round(metrics.reduce((acc, curr) => acc + curr.score, 0) / metrics.length);
    const goodCount = metrics.filter(m => m.status === "good").length;

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    SEO Health
                </h3>
                <button className="text-xs text-primary hover:underline flex items-center gap-1">
                    View Details <ArrowUpRight className="w-3 h-3" />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-muted/20 rounded-xl p-4 border border-border/50">
                    <span className="text-sm text-muted-foreground">Avg Rank Math</span>
                    <div className="text-3xl font-bold mt-1 text-foreground">{averageScore}/100</div>
                </div>
                <div className="bg-muted/20 rounded-xl p-4 border border-border/50">
                    <span className="text-sm text-muted-foreground">Healthy Posts</span>
                    <div className="text-3xl font-bold mt-1 text-green-500">{goodCount}<span className="text-sm text-muted-foreground font-normal ml-1">/ {metrics.length}</span></div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {metrics.map((metric) => (
                    <div key={metric.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium truncate text-sm">{metric.title}</span>
                                {metric.trend === "up" && <TrendingUp className="w-3 h-3 text-green-500" />}
                                {metric.trend === "down" && <TrendingDown className="w-3 h-3 text-red-500" />}
                                {metric.trend === "flat" && <Minus className="w-3 h-3 text-muted-foreground" />}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>{metric.wordCount.toLocaleString()} words</span>
                                <span>{metric.keywordDensity}% density</span>
                            </div>
                        </div>

                        <div className="relative w-12 h-12 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-muted/30" />
                                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent"
                                    className={`${metric.score >= 90 ? 'text-green-500' : metric.score >= 80 ? 'text-yellow-500' : 'text-red-500'}`}
                                    strokeDasharray={`${(metric.score / 100) * 125.6} 125.6`}
                                />
                            </svg>
                            <span className="absolute text-xs font-bold">{metric.score}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
