"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Brain,
    PenTool,
    Building2,
    Globe,
    Palette,
    Megaphone,
    Mic2,
    Wrench,
    ArrowRight,
    Calendar,
    Activity,
    Zap,
    Clock,
    CheckCircle2,
    AlertCircle,
    Pause,
    ChevronDown,
    ChevronUp,
} from "lucide-react";

// --- Worker Definitions ---

export interface WorkerDef {
    id: string;
    name: string;
    icon: React.ElementType;
    description: string;
    schedule: string[];
    scheduleDays: number[]; // 0=Sun, 1=Mon, ... 6=Sat
    services: string[];
    color: string;
    status: "idle" | "active" | "error" | "scheduled";
}

const WORKERS: WorkerDef[] = [
    {
        id: "topic-manager",
        name: "Topic Manager",
        icon: Brain,
        description: "Researches trending US-Israel tax topics via Tavily, then plans content strategy with Claude AI.",
        schedule: ["Mon", "Thu"],
        scheduleDays: [1, 4],
        services: ["Airtable", "Tavily", "Claude"],
        color: "#9FCA3B",
        status: "idle",
    },
    {
        id: "content-generator",
        name: "Content Generator",
        icon: PenTool,
        description: "Writes 2000+ word professional Hebrew blog posts using Claude, generates SEO metadata and scores.",
        schedule: ["Mon", "Thu"],
        scheduleDays: [1, 4],
        services: ["Claude", "SEO Scorer"],
        color: "#6366f1",
        status: "idle",
    },
    {
        id: "gutenberg-builder",
        name: "Gutenberg Builder",
        icon: Building2,
        description: "Converts markdown articles into WordPress Gutenberg block format with proper heading hierarchy.",
        schedule: ["Mon", "Thu"],
        scheduleDays: [1, 4],
        services: ["WordPress"],
        color: "#0ea5e9",
        status: "idle",
    },
    {
        id: "translator",
        name: "Translator",
        icon: Globe,
        description: "Translates content between Hebrew ↔ English while preserving WordPress block structure.",
        schedule: ["Mon", "Thu"],
        scheduleDays: [1, 4],
        services: ["Claude"],
        color: "#f59e0b",
        status: "idle",
    },
    {
        id: "media-processor",
        name: "Media Processor",
        icon: Palette,
        description: "Generates featured images via Kie.ai, polls for completion, then uploads to WordPress media library.",
        schedule: ["Mon", "Thu"],
        scheduleDays: [1, 4],
        services: ["Kie.ai", "WordPress"],
        color: "#ec4899",
        status: "idle",
    },
    {
        id: "social-publisher",
        name: "Social Publisher",
        icon: Megaphone,
        description: "Creates tailored LinkedIn & Facebook posts from published articles using Claude AI for each platform.",
        schedule: ["Mon", "Thu"],
        scheduleDays: [1, 4],
        services: ["Claude", "Facebook", "LinkedIn"],
        color: "#10b981",
        status: "idle",
    },
    {
        id: "podcast-producer",
        name: "Podcast Producer",
        icon: Mic2,
        description: "Generates dialogue scripts, synthesizes multi-voice audio with ElevenLabs, publishes episodes to Captivate.",
        schedule: ["Wed"],
        scheduleDays: [3],
        services: ["ElevenLabs", "Captivate", "WordPress"],
        color: "#f97316",
        status: "idle",
    },
    {
        id: "data-healer",
        name: "Data Auto-Healer",
        icon: Wrench,
        description: "Scans Airtable for incomplete records (missing titles/outlines) and auto-fills via AI research.",
        schedule: ["On-demand"],
        scheduleDays: [],
        services: ["Airtable", "Claude"],
        color: "#7A7A7A",
        status: "idle",
    },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// --- Flow Nodes for Pipeline Diagram ---
const FLOW_STEPS = [
    { id: "topic", label: "Topic Research", icon: Brain, workerId: "topic-manager" },
    { id: "content", label: "Content Draft", icon: PenTool, workerId: "content-generator" },
    { id: "media", label: "Media Gen", icon: Palette, workerId: "media-processor" },
    { id: "publish", label: "WP Publish", icon: Building2, workerId: "gutenberg-builder" },
    { id: "social", label: "Social Media", icon: Megaphone, workerId: "social-publisher" },
    { id: "podcast", label: "Podcast", icon: Mic2, workerId: "podcast-producer" },
];

// --- Component ---

export function WorkerStatusBoard() {
    const [currentDay, setCurrentDay] = useState(new Date().getDay());
    const [expanded, setExpanded] = useState(true);
    const [activeWorkers, setActiveWorkers] = useState<Set<string>>(new Set());

    // Determine active workers based on day
    useEffect(() => {
        const day = new Date().getDay();
        setCurrentDay(day);
        const active = new Set<string>();
        WORKERS.forEach((w) => {
            if (w.scheduleDays.includes(day)) {
                active.add(w.id);
            }
        });
        setActiveWorkers(active);
    }, []);

    const getWorkerStatus = (worker: WorkerDef): "active" | "scheduled" | "idle" => {
        if (activeWorkers.has(worker.id)) return "active";
        // Check if worker runs any day this week after today
        const upcomingDays = worker.scheduleDays.filter((d) => d > currentDay);
        if (upcomingDays.length > 0) return "scheduled";
        return "idle";
    };

    const getStatusConfig = (status: "active" | "scheduled" | "idle") => {
        switch (status) {
            case "active":
                return {
                    label: "Active Today",
                    icon: Activity,
                    className: "text-green-400 bg-green-500/10 border-green-500/30",
                    pulse: true,
                };
            case "scheduled":
                return {
                    label: "Scheduled",
                    icon: Clock,
                    className: "text-amber-400 bg-amber-500/10 border-amber-500/30",
                    pulse: false,
                };
            case "idle":
                return {
                    label: "Idle",
                    icon: Pause,
                    className: "text-gray-400 bg-gray-500/10 border-gray-500/30",
                    pulse: false,
                };
        }
    };

    return (
        <div className="space-y-4">
            {/* Header with toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                        <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold font-heading text-foreground">
                            Pipeline Workers
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {activeWorkers.size} of {WORKERS.length} workers active · {DAYS[currentDay]}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors"
                >
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-5 overflow-hidden"
                    >
                        {/* ---- Content Flow Diagram ---- */}
                        <div className="relative">
                            <div className="flex items-center justify-between gap-1 px-2">
                                {FLOW_STEPS.map((step, idx) => {
                                    const isActive = activeWorkers.has(step.workerId);
                                    const Icon = step.icon;
                                    const worker = WORKERS.find((w) => w.id === step.workerId);
                                    const color = worker?.color || "#9FCA3B";

                                    return (
                                        <React.Fragment key={step.id}>
                                            <motion.div
                                                className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border transition-all ${isActive
                                                        ? "bg-card border-border/50 shadow-sm"
                                                        : "bg-muted/30 border-transparent"
                                                    }`}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.06 }}
                                            >
                                                <div
                                                    className={`p-2 rounded-lg ${isActive ? "shadow-sm" : "opacity-50"}`}
                                                    style={{
                                                        backgroundColor: isActive
                                                            ? `${color}20`
                                                            : "rgba(128,128,128,0.1)",
                                                    }}
                                                >
                                                    <Icon
                                                        className="h-4 w-4"
                                                        style={{ color: isActive ? color : "#888" }}
                                                    />
                                                </div>
                                                <span
                                                    className={`text-[10px] font-medium text-center leading-tight ${isActive ? "text-foreground" : "text-muted-foreground/60"
                                                        }`}
                                                >
                                                    {step.label}
                                                </span>
                                                {isActive && (
                                                    <motion.div
                                                        className="w-1.5 h-1.5 rounded-full bg-green-400"
                                                        animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                    />
                                                )}
                                            </motion.div>

                                            {idx < FLOW_STEPS.length - 1 && (
                                                <ArrowRight
                                                    className={`h-3.5 w-3.5 flex-shrink-0 ${isActive && activeWorkers.has(FLOW_STEPS[idx + 1]?.workerId)
                                                            ? "text-primary/70"
                                                            : "text-muted-foreground/25"
                                                        }`}
                                                />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ---- Weekly Schedule Bar ---- */}
                        <div className="bg-muted/30 rounded-xl p-3 border border-border/30">
                            <div className="flex items-center gap-2 mb-2.5">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">Weekly Schedule</span>
                            </div>
                            <div className="grid grid-cols-7 gap-1.5">
                                {DAYS.map((day, dayIdx) => {
                                    const isToday = dayIdx === currentDay;
                                    const dayWorkers = WORKERS.filter((w) => w.scheduleDays.includes(dayIdx));
                                    const hasWorkers = dayWorkers.length > 0;

                                    return (
                                        <div
                                            key={day}
                                            className={`text-center py-2 px-1 rounded-lg transition-all ${isToday
                                                    ? "bg-primary/15 border border-primary/30 shadow-sm"
                                                    : hasWorkers
                                                        ? "bg-card/50 border border-border/20"
                                                        : "bg-transparent border border-transparent"
                                                }`}
                                        >
                                            <div
                                                className={`text-[10px] font-bold mb-1 ${isToday ? "text-primary" : "text-muted-foreground"
                                                    }`}
                                            >
                                                {day}
                                            </div>
                                            <div className="flex justify-center gap-0.5 flex-wrap">
                                                {dayWorkers.length > 0 ? (
                                                    dayWorkers.slice(0, 3).map((w) => (
                                                        <div
                                                            key={w.id}
                                                            className="w-2 h-2 rounded-full"
                                                            style={{ backgroundColor: w.color }}
                                                            title={w.name}
                                                        />
                                                    ))
                                                ) : (
                                                    <div className="w-2 h-2 rounded-full bg-gray-300/20" />
                                                )}
                                            </div>
                                            {dayWorkers.length > 3 && (
                                                <div className="text-[8px] text-muted-foreground mt-0.5">
                                                    +{dayWorkers.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ---- Worker Cards Grid ---- */}
                        <div className="grid grid-cols-4 gap-3">
                            {WORKERS.map((worker, idx) => {
                                const status = getWorkerStatus(worker);
                                const statusConfig = getStatusConfig(status);
                                const StatusIcon = statusConfig.icon;
                                const WorkerIcon = worker.icon;

                                return (
                                    <motion.div
                                        key={worker.id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={`relative bg-card rounded-xl border p-3.5 transition-all hover:shadow-md group ${status === "active"
                                                ? "border-border/50 shadow-sm"
                                                : "border-border/20"
                                            }`}
                                    >
                                        {/* Active glow */}
                                        {status === "active" && (
                                            <div
                                                className="absolute inset-0 rounded-xl opacity-[0.04] pointer-events-none"
                                                style={{
                                                    background: `radial-gradient(ellipse at top, ${worker.color}, transparent 70%)`,
                                                }}
                                            />
                                        )}

                                        <div className="relative z-10">
                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-2">
                                                <div
                                                    className="p-2 rounded-lg"
                                                    style={{ backgroundColor: `${worker.color}15` }}
                                                >
                                                    <WorkerIcon className="h-4 w-4" style={{ color: worker.color }} />
                                                </div>
                                                <div
                                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${statusConfig.className}`}
                                                >
                                                    {statusConfig.pulse && (
                                                        <motion.div
                                                            className="w-1.5 h-1.5 rounded-full bg-green-400"
                                                            animate={{
                                                                scale: [1, 1.5, 1],
                                                                opacity: [1, 0.4, 1],
                                                            }}
                                                            transition={{ duration: 1.5, repeat: Infinity }}
                                                        />
                                                    )}
                                                    {statusConfig.label}
                                                </div>
                                            </div>

                                            {/* Name & Description */}
                                            <h3 className="text-sm font-semibold text-foreground mb-1">
                                                {worker.name}
                                            </h3>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed mb-2.5 line-clamp-2">
                                                {worker.description}
                                            </p>

                                            {/* Footer: Services + Schedule */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    {worker.services.slice(0, 2).map((svc) => (
                                                        <span
                                                            key={svc}
                                                            className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground border border-border/20"
                                                        >
                                                            {svc}
                                                        </span>
                                                    ))}
                                                    {worker.services.length > 2 && (
                                                        <span className="text-[9px] text-muted-foreground">
                                                            +{worker.services.length - 2}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[9px] font-medium text-muted-foreground/70">
                                                    {worker.schedule.join(", ")}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
