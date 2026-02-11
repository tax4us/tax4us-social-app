"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface PremiumStatCardProps {
    title: string;
    value: string | number;
    trend?: string;
    icon: ReactNode;
    description?: string;
    explanation?: string;
}

export function PremiumStatCard({ title, value, trend, icon, description, explanation }: PremiumStatCardProps) {
    return (
        <TooltipProvider>
            <motion.div
                whileHover={{
                    y: -6,
                    rotateX: 2,
                    rotateY: -2,
                    boxShadow: "0 25px 50px -12px rgba(159, 202, 59, 0.2)"
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative group bg-white/80 backdrop-blur-xl border border-white/20 p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden cursor-default"
            >
                {/* Glossy Overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex h-12 w-12 items-center justify-center bg-primary/5 rounded-2xl border border-primary/10 text-primary shadow-inner shrink-0">
                            {icon}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 pt-1">
                            {trend && (
                                <div className="px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 text-[9px] font-bold tracking-widest uppercase">
                                    {trend}
                                </div>
                            )}
                            {explanation && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button className="p-1 hover:bg-primary/10 rounded-full transition-colors opacity-30 hover:opacity-100">
                                            <Info className="w-3.5 h-3.5 text-primary" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[280px] p-4 bg-white/90 backdrop-blur-md border border-primary/20 shadow-2xl rounded-2xl z-[100]">
                                        <p className="text-xs leading-relaxed text-foreground font-medium">
                                            {explanation}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 space-y-1">
                        <h3 className="text-[10px] font-bold text-foreground/40 tracking-[0.15em] uppercase">
                            {title}
                        </h3>
                        <div className="flex items-baseline gap-1.5">
                            <p className="text-3xl font-bold text-foreground font-heading tracking-tight italic">
                                {value}
                            </p>
                            {description && (
                                <span className="text-[10px] text-foreground/30 font-medium italic lowercase">
                                    / {description}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Subtle 3D Depth Indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
        </TooltipProvider>
    );
}
