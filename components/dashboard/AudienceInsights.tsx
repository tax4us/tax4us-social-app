"use client";

import React from "react";
import { motion } from "framer-motion";
import { Facebook, Linkedin, Mic2, Globe, TrendingUp, TrendingDown, Users, Target } from "lucide-react";
import { UnifiedInsights, PlatformInsights } from "@/lib/services/insights";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AudienceInsightsProps {
    insights: UnifiedInsights;
}

const platformIcons: Record<string, React.ReactNode> = {
    wordpress: <Globe className="w-4 h-4 text-indigo-600" />,
    facebook: <Facebook className="w-4 h-4 text-blue-600" />,
    linkedin: <Linkedin className="w-4 h-4 text-blue-700" />,
    podcast: <Mic2 className="w-4 h-4 text-purple-600" />
};

export function AudienceInsights({ insights }: AudienceInsightsProps) {
    if (!insights) return null;

    return (
        <Card className="bg-white/80 backdrop-blur-xl border-white/20 shadow-lg overflow-hidden lg:col-span-1">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold font-heading flex items-center gap-2">
                            <Target className="w-5 h-5 text-primary" />
                            Audience Reach
                        </CardTitle>
                        <CardDescription className="text-[10px] uppercase tracking-wider">Multi-Platform Intelligence</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] py-0 px-2">Live</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Hero Stats */}
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-foreground/5">
                    <div>
                        <p className="text-[10px] text-foreground/40 uppercase tracking-widest mb-1 font-bold">Total Reach</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold font-heading">{insights.totalReach.toLocaleString()}</span>
                            <span className="text-xs text-emerald-500 font-bold flex items-center gap-0.5">
                                <TrendingUp className="w-3 h-3" />
                                +14%
                            </span>
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] text-foreground/40 uppercase tracking-widest mb-1 font-bold">Engagement</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold font-heading">{insights.totalEngagement.toLocaleString()}</span>
                            <span className="text-xs text-emerald-500 font-bold flex items-center gap-0.5">
                                <TrendingUp className="w-3 h-3" />
                                +8%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Platform Breakdown */}
                <div className="space-y-3 pt-2">
                    {insights.social.map((platform: PlatformInsights) => (
                        <div key={platform.platform} className="relative group p-3 rounded-xl bg-foreground/[0.02] border border-foreground/5 transition-all hover:bg-white hover:shadow-md hover:scale-[1.02]">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-white shadow-sm border border-foreground/5">
                                        {platformIcons[platform.platform]}
                                    </div>
                                    <span className="text-xs font-bold capitalize tracking-tight">{platform.platform}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-foreground/60">{platform.percentage}% share</span>
                                    {platform.trending === "up" ? (
                                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                                    ) : platform.trending === "down" ? (
                                        <TrendingDown className="w-3 h-3 text-amber-500" />
                                    ) : null}
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                        <Users className="w-3 h-3 opacity-40" />
                                        <span className="font-medium">{platform.reach.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3 opacity-40" />
                                        <span className="font-medium">{platform.engagement.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="h-1 w-20 rounded-full bg-foreground/5 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${platform.percentage}%` }}
                                        className="h-full bg-primary/40 rounded-full"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
