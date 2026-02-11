"use client";

import React from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import type { CostSummary } from "@/lib/services/api-costs";

interface CostMonitorProps {
    costData: CostSummary;
}

function MiniSparkline({ data }: { data: number[] }) {
    if (!data || data.length < 2) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const w = 80;
    const h = 28;
    const points = data.map((v, i) =>
        `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`
    ).join(" ");

    return (
        <svg width={w} height={h} className="opacity-60">
            <polyline
                points={points}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
            />
        </svg>
    );
}

export function CostMonitor({ costData }: CostMonitorProps) {
    const trend = costData.weeklyTrend;
    const isRising = trend.length >= 2 && trend[trend.length - 1] > trend[trend.length - 2];

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="relative group bg-white/80 backdrop-blur-xl border border-white/20 rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden"
        >
            {/* Glossy overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-foreground/50 tracking-wider uppercase">AI Spend</h3>
                            <p className="text-[10px] text-foreground/30">Updated {costData.lastUpdated}</p>
                        </div>
                    </div>
                    <MiniSparkline data={trend} />
                </div>

                {/* Hero Number */}
                <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-bold text-foreground font-heading">
                        ${costData.totalThisMonth.toFixed(2)}
                    </span>
                    <span className="text-xs text-foreground/40">this month</span>
                    {isRising ? (
                        <TrendingUp className="w-3.5 h-3.5 text-amber-500 ml-auto" />
                    ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
                    )}
                </div>

                {/* Per-unit costs */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 rounded-lg bg-foreground/[0.02] border border-foreground/5">
                        <p className="text-lg font-bold text-foreground">${costData.costPerArticle.toFixed(2)}</p>
                        <p className="text-[9px] text-foreground/40 uppercase tracking-wide">per article</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-foreground/[0.02] border border-foreground/5">
                        <p className="text-lg font-bold text-foreground">${costData.costPerPodcast.toFixed(2)}</p>
                        <p className="text-[9px] text-foreground/40 uppercase tracking-wide">per episode</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-foreground/[0.02] border border-foreground/5">
                        <p className="text-lg font-bold text-foreground">${costData.costPerVideo.toFixed(2)}</p>
                        <p className="text-[9px] text-foreground/40 uppercase tracking-wide">per video</p>
                    </div>
                </div>

                {/* Service Breakdown */}
                <div className="space-y-2">
                    {costData.services.map((svc) => (
                        <div key={svc.id} className="flex items-center gap-2.5">
                            <span className="text-sm w-5 text-center">{svc.icon}</span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-[11px] font-medium text-foreground/70 truncate">{svc.name}</span>
                                    <span className="text-[11px] font-bold text-foreground/80">${svc.spent.toFixed(2)}</span>
                                </div>
                                <div className="h-1 rounded-full bg-foreground/5 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(svc.usagePercent, 100)}%` }}
                                        transition={{ duration: 0.8, delay: 0.3 }}
                                        className={`h-full rounded-full ${svc.usagePercent >= 90 ? "bg-red-500" :
                                                svc.usagePercent >= 70 ? "bg-amber-500" :
                                                    "bg-emerald-500"
                                            }`}
                                    />
                                </div>
                            </div>
                            <span className="text-[9px] text-foreground/30 w-10 text-right">
                                {svc.unitCount} {svc.unit}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Alerts */}
                {costData.alerts.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                        {costData.alerts.map((alert, i) => (
                            <div
                                key={i}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-medium ${alert.severity === "critical"
                                        ? "bg-red-500/10 text-red-600 border border-red-500/20"
                                        : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                    }`}
                            >
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                <span>{alert.message}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom accent */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.div>
    );
}
