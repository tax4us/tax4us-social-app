"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bot, Terminal, Zap, Info } from "lucide-react";
import { useState, useEffect } from "react";

export function AgentIntelligenceWidget() {
    const [thought, setThought] = useState("Connecting to AI core...");
    const [progress, setProgress] = useState(0);

    const thoughts = [
        "Analyzing Israeli-US cross-border tax treaty nuances...",
        "Identifying tax-efficient retirement planning opportunities...",
        "Validating content against 2026 Tax4Us strategic vision...",
        "Synthesizing multi-voice podcast dialogue for high engagement...",
        "Scanning regulatory updates for Israeli-American residents...",
        "Optimizing digital footprint for high-net-worth Israeli clients..."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setThought(thoughts[Math.floor(Math.random() * thoughts.length)]);
            setProgress(prev => (prev + 15) % 100);
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative group rounded-[32px] overflow-hidden p-1 bg-gradient-to-br from-primary/20 via-primary/5 to-secondary/10 shadow-2xl">
            <div className="relative bg-black/90 backdrop-blur-3xl rounded-[31px] p-8 text-white min-h-[320px] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg border border-primary/30">
                            <Bot className="h-5 w-5 text-primary animate-pulse" />
                        </div>
                        <h3 className="text-lg font-bold font-heading tracking-tight">Intelligence Module</h3>
                    </div>
                    <div className="flex gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                        <span className="w-2 h-2 rounded-full bg-primary/30" />
                        <span className="w-2 h-2 rounded-full bg-primary/30" />
                    </div>
                </div>

                {/* Main Thought Area */}
                <div className="flex-1 flex flex-col justify-center border-l-2 border-primary/20 pl-6 ml-1">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={thought}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <div className="flex items-start gap-3">
                                <Terminal className="h-4 w-4 text-primary/60 mt-1 shrink-0" />
                                <p className="text-xl font-medium leading-relaxed font-sans text-white/90">
                                    {thought}
                                </p>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer Metrics */}
                <div className="mt-10 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <div className="text-[10px]">
                            <p className="opacity-40 uppercase font-bold tracking-widest">Cognitive Load</p>
                            <div className="w-full bg-white/10 h-1 rounded-full mt-1 overflow-hidden">
                                <motion.div
                                    className="bg-primary h-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-primary" />
                        <div className="text-[10px]">
                            <p className="opacity-40 uppercase font-bold tracking-widest">Model Precision</p>
                            <p className="font-mono text-white/80">Active</p>
                        </div>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Bot className="h-32 w-32" />
                </div>
            </div>
        </div>
    );
}
