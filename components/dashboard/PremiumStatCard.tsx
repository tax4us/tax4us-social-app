"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PremiumStatCardProps {
    title: string;
    value: string | number;
    trend?: string;
    icon: ReactNode;
    description?: string;
}

export function PremiumStatCard({ title, value, trend, icon, description }: PremiumStatCardProps) {
    return (
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

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-primary shadow-inner">
                        {icon}
                    </div>
                    {trend && (
                        <div className="px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 text-[10px] font-bold tracking-wider uppercase">
                            {trend}
                        </div>
                    )}
                </div>

                <h3 className="text-sm font-bold text-foreground/50 tracking-wide mb-1 uppercase">
                    {title}
                </h3>
                <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-bold text-foreground font-heading">
                        {value}
                    </p>
                </div>
                {description && (
                    <p className="text-xs text-foreground/40 mt-3 italic">
                        {description}
                    </p>
                )}
            </div>

            {/* Subtle 3D Depth Indicator */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.div>
    );
}
