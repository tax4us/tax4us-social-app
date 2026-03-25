"use client";

import React from "react";
import { motion } from "framer-motion";
import { Languages, Globe, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BilingualItem {
    id: string;
    titleHe: string;
    titleEn?: string;
    status: "published" | "draft" | "scheduled";
    translationStatus: "linked" | "missing" | "pending";
    date: string;
}

interface BilingualContentCardProps {
    items: BilingualItem[];
}

const translationBadge = {
    linked: { label: "Linked", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    pending: { label: "Pending", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-200" },
    missing: { label: "Missing", icon: AlertCircle, color: "text-red-500 bg-red-50 border-red-200" },
};

export function BilingualContentCard({ items }: BilingualContentCardProps) {
    // Show only items that have at least a Hebrew title — take first 4
    const bilingualItems = items.filter(i => i.titleHe).slice(0, 4);

    if (bilingualItems.length === 0) return null;

    const linkedCount = items.filter(i => i.translationStatus === "linked").length;
    const missingCount = items.filter(i => i.translationStatus === "missing").length;

    return (
        <Card className="bg-white/80 backdrop-blur-xl border-white/20 shadow-lg overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold font-heading flex items-center gap-2 italic">
                            <Languages className="w-5 h-5 text-primary" />
                            Bilingual Content
                        </CardTitle>
                        <CardDescription className="text-[10px] uppercase tracking-wider">
                            Hebrew ↔ English content status
                        </CardDescription>
                    </div>
                    <div className="flex gap-1.5">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] py-0 px-2">
                            {linkedCount} linked
                        </Badge>
                        {missingCount > 0 && (
                            <Badge variant="outline" className="bg-red-50 text-red-500 border-red-200 text-[10px] py-0 px-2">
                                {missingCount} missing
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {bilingualItems.map((item, index) => {
                    const badge = translationBadge[item.translationStatus];
                    const BadgeIcon = badge.icon;
                    return (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * index, duration: 0.35 }}
                            className="group rounded-xl border border-foreground/5 bg-foreground/[0.02] hover:bg-white hover:shadow-md transition-all duration-300 overflow-hidden"
                        >
                            {/* Split Panel */}
                            <div className="grid grid-cols-2 divide-x divide-foreground/5">
                                {/* Hebrew Panel (RTL) */}
                                <div className="p-3 bg-gradient-to-r from-indigo-50/30 to-transparent">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <span className="text-[9px] font-bold text-indigo-600/60 uppercase tracking-widest">עברית</span>
                                        <Globe className="w-2.5 h-2.5 text-indigo-400" />
                                    </div>
                                    <p className="text-xs font-semibold text-foreground/80 leading-snug line-clamp-2" dir="rtl">
                                        {item.titleHe}
                                    </p>
                                </div>

                                {/* English Panel */}
                                <div className="p-3">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <span className="text-[9px] font-bold text-foreground/40 uppercase tracking-widest">English</span>
                                        <Globe className="w-2.5 h-2.5 text-foreground/30" />
                                    </div>
                                    <p className="text-xs font-medium text-foreground/60 leading-snug line-clamp-2">
                                        {item.titleEn || (
                                            <span className="italic text-foreground/30">Translation pending...</span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between px-3 py-1.5 bg-foreground/[0.01] border-t border-foreground/5">
                                <span className="text-[10px] text-foreground/40 font-medium">{item.date}</span>
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold ${badge.color}`}>
                                    <BadgeIcon className="w-2.5 h-2.5" />
                                    {badge.label}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
