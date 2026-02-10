"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    Facebook,
    Linkedin,
    Globe,
    Mic,
    ExternalLink,
    Clock,
    ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityItem {
    id: string;
    type: "wordpress" | "facebook" | "linkedin" | "podcast";
    title: string;
    timestamp: string;
    rawDate: string;
    url?: string;
}

interface LiveFeedProps {
    activities?: ActivityItem[];
}

const defaultActivities: ActivityItem[] = [
    { id: "1", type: "wordpress", title: "Navigating 2025 US Tax Reforms", timestamp: "2 hours ago", rawDate: new Date().toISOString(), url: "#" },
    { id: "2", type: "podcast", title: "Emma & Ben: Cross-Border Wealth", timestamp: "5 hours ago", rawDate: new Date().toISOString(), url: "#" },
    { id: "3", type: "linkedin", title: "Expert Insight: Corporate Tax 🇮🇱", timestamp: "1 day ago", rawDate: new Date().toISOString(), url: "#" },
    { id: "4", type: "facebook", title: "Live Update: FBAR Deadlines", timestamp: "2 days ago", rawDate: new Date().toISOString(), url: "#" },
];

export function LiveFeed({ activities = defaultActivities }: LiveFeedProps) {
    const getIcon = (type: string) => {
        switch (type) {
            case "facebook": return <Facebook className="w-4 h-4 text-blue-600" />;
            case "linkedin": return <Linkedin className="w-4 h-4 text-blue-700" />;
            case "podcast": return <Mic className="w-4 h-4 text-purple-600" />;
            default: return <Globe className="w-4 h-4 text-primary" />;
        }
    };

    return (
        <Card className="border-border/50 shadow-sm overflow-hidden h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/30">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    Live System activity
                </CardTitle>
                <div className="flex items-center gap-1.5 animate-pulse">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[10px] font-bold text-green-600 uppercase">Live Feed</span>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto">
                <div className="divide-y divide-border/30">
                    {activities.map((activity, idx) => (
                        <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="p-4 hover:bg-muted/30 transition-colors group cursor-pointer"
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 p-2 rounded-lg bg-background border border-border shadow-sm group-hover:bg-primary/5 transition-colors">
                                    {getIcon(activity.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                                            {activity.title}
                                        </p>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" />
                                            {activity.timestamp}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">
                                            {activity.type === 'wordpress' ? 'WP Post' : activity.type}
                                        </span>
                                        {activity.url && (
                                            <a
                                                href={activity.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[10px] font-bold text-primary flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                VIEW LIVE <ChevronRight className="w-2.5 h-2.5" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
