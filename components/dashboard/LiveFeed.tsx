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
        <div className="overflow-hidden h-full flex flex-col">
            <div className="flex-1 overflow-auto max-h-[350px] scrollbar-hide">
                <div className="divide-y divide-border/20">
                    {activities.map((activity, idx) => (
                        <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="p-3 hover:bg-primary/5 transition-all duration-200 group cursor-pointer border-l-2 border-transparent hover:border-primary"
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 p-1.5 rounded-lg bg-background border border-border/50 shadow-sm group-hover:border-primary/30 transition-colors">
                                    {getIcon(activity.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <p className="text-xs font-bold truncate group-hover:text-primary transition-colors leading-tight">
                                            {activity.title}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-[9px] uppercase font-bold text-muted-foreground/50 tracking-wider flex items-center gap-1">
                                            {activity.type === 'wordpress' ? 'WP Post' : activity.type}
                                            <span className="opacity-40">•</span>
                                            {activity.timestamp}
                                        </span>
                                        {activity.url && (
                                            <a
                                                href={activity.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[9px] font-bold text-primary flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                LINK <ExternalLink className="w-2 h-2" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
