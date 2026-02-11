"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Activity,
    Cpu,
    Database,
    Globe,
    HardDrive,
    MemoryStick,
    Server,
    ShieldCheck,
    Signal,
    Wifi,
    AlertCircle,
    CheckCircle2,
    Clock
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Mock Data Types
interface SystemMetric {
    id: string;
    name: string;
    value: number;
    unit: string;
    status: "healthy" | "warning" | "critical";
    history: number[];
}

interface ServiceStatus {
    id: string;
    name: string;
    status: "operational" | "degraded" | "outage" | "maintenance";
    uptime: number; // percentage
    latency: number; // ms
    lastIncident?: string;
}

// Mock Data
const initialMetrics: SystemMetric[] = [
    {
        id: "cpu",
        name: "CPU Usage",
        value: 42,
        unit: "%",
        status: "healthy",
        history: [35, 38, 40, 45, 42, 48, 50, 42, 38, 42, 45, 42]
    },
    {
        id: "memory",
        name: "Memory Usage",
        value: 68,
        unit: "%",
        status: "warning",
        history: [60, 62, 65, 68, 70, 72, 70, 68, 65, 68, 70, 68]
    },
    {
        id: "storage",
        name: "Storage",
        value: 24,
        unit: "%",
        status: "healthy",
        history: [20, 21, 21, 22, 22, 23, 23, 24, 24, 24, 24, 24]
    },
    {
        id: "network",
        name: "Network I/O",
        value: 125,
        unit: "MB/s",
        status: "healthy",
        history: [80, 150, 120, 90, 110, 130, 140, 120, 110, 125, 130, 125]
    }
];

const initialServices: ServiceStatus[] = [
    {
        id: "api",
        name: "API Gateway",
        status: "operational",
        uptime: 99.99,
        latency: 45
    },
    {
        id: "db",
        name: "Primary Database",
        status: "operational",
        uptime: 99.95,
        latency: 12
    },
    {
        id: "auth",
        name: "Authentication Service",
        status: "operational",
        uptime: 99.90,
        latency: 85
    },
    {
        id: "cdn",
        name: "CDN Delivery",
        status: "degraded",
        uptime: 98.50,
        latency: 150,
        lastIncident: "High latency in EU-West"
    },
    {
        id: "workers",
        name: "Background Workers",
        status: "operational",
        uptime: 99.99,
        latency: 5
    }
];

export default function SystemMonitor() {
    const [metrics, setMetrics] = useState<SystemMetric[]>(initialMetrics);
    const [isLive, setIsLive] = useState(true);

    // Simulate live data updates
    useEffect(() => {
        if (!isLive) return;

        const interval = setInterval(() => {
            setMetrics(prevMetrics =>
                prevMetrics.map(metric => {
                    const change = (Math.random() - 0.5) * 5;
                    let newValue = Math.max(0, Math.min(100, metric.value + change));
                    if (metric.id === 'network') {
                        newValue = Math.max(0, metric.value + (Math.random() - 0.5) * 20);
                    }
                    let status: SystemMetric["status"] = "healthy";
                    if (metric.id !== 'network') {
                        if (newValue > 90) status = "critical";
                        else if (newValue > 75) status = "warning";
                    }
                    const newHistory = [...metric.history.slice(1), newValue];
                    return { ...metric, value: Math.round(newValue), status, history: newHistory };
                })
            );
        }, 3000);

        return () => clearInterval(interval);
    }, [isLive]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "operational": case "healthy": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
            case "warning": case "degraded": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
            case "critical": case "outage": return "text-rose-500 bg-rose-500/10 border-rose-500/20";
            default: return "text-muted-foreground bg-muted/10 border-border/20";
        }
    };

    const getIcon = (id: string) => {
        switch (id) {
            case "cpu": return <Cpu className="w-3.5 h-3.5" />;
            case "memory": return <MemoryStick className="w-3.5 h-3.5" />;
            case "storage": return <HardDrive className="w-3.5 h-3.5" />;
            default: return <Activity className="w-3.5 h-3.5" />;
        }
    };

    return (
        <Card className="border-primary/10 shadow-lg bg-card/40 backdrop-blur-md overflow-hidden">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">
                    Infrastructure
                </CardTitle>
                <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${isLive ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500' : 'border-muted bg-muted/50 text-muted-foreground'}`}>
                        <span className="relative flex h-1.5 w-1.5">
                            {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isLive ? 'bg-emerald-500' : 'bg-muted-foreground'}`}></span>
                        </span>
                        {isLive ? "LIVE" : "PAUSED"}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    {metrics.slice(0, 4).map((metric) => (
                        <div key={metric.id} className="p-2.5 rounded-xl border border-primary/5 bg-background/50 hover:bg-primary/5 transition-colors group">
                            <div className="flex items-center justify-between mb-1">
                                <div className={`p-1.5 rounded-lg ${getStatusColor(metric.status).replace('text-', 'bg-').split(' ')[1]} bg-opacity-10 group-hover:scale-110 transition-transform`}>
                                    {getIcon(metric.id)}
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground/60">{metric.unit}</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold tracking-tighter">{metric.value}</span>
                                <span className="text-[9px] font-bold text-muted-foreground truncate uppercase">{metric.name.split(' ')[0]}</span>
                            </div>
                            <div className={`h-1 w-full bg-muted/30 rounded-full mt-2 overflow-hidden`}>
                                <motion.div
                                    className={`h-full ${getStatusColor(metric.status).split(' ')[1].replace('bg-', 'bg-')}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, metric.value)}%` }}
                                    transition={{ duration: 1 }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-2 pt-2 border-t border-primary/5">
                    {initialServices.slice(0, 3).map((service) => (
                        <div key={service.id} className="flex items-center justify-between group cursor-default">
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${service.status === 'operational' ? 'bg-emerald-500' : 'bg-amber-500'} group-hover:animate-pulse`} />
                                <span className="text-[11px] font-bold text-muted-foreground/80 group-hover:text-primary transition-colors">{service.name}</span>
                            </div>
                            <span className="text-[10px] font-mono opacity-40">{service.latency}ms</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
