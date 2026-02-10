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
    const [selectedMetric, setSelectedMetric] = useState<string>("cpu");
    const [isLive, setIsLive] = useState(true);

    // Simulate live data updates
    useEffect(() => {
        if (!isLive) return;

        const interval = setInterval(() => {
            setMetrics(prevMetrics =>
                prevMetrics.map(metric => {
                    // Generate realistic fluctuation
                    const change = (Math.random() - 0.5) * 10;
                    let newValue = Math.max(0, Math.min(100, metric.value + change));

                    // Special handling for network which isn't percentage based
                    if (metric.id === 'network') {
                        newValue = Math.max(0, metric.value + (Math.random() - 0.5) * 50);
                    }

                    // Determine status based on thresholds
                    let status: SystemMetric["status"] = "healthy";
                    if (metric.id !== 'network') {
                        if (newValue > 90) status = "critical";
                        else if (newValue > 75) status = "warning";
                    }

                    const newHistory = [...metric.history.slice(1), newValue];

                    return {
                        ...metric,
                        value: Math.round(newValue),
                        status,
                        history: newHistory
                    };
                })
            );
        }, 2000);

        return () => clearInterval(interval);
    }, [isLive]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "operational":
            case "healthy":
                return "text-green-500 bg-green-500/10 border-green-500/20";
            case "warning":
            case "degraded":
                return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
            case "critical":
            case "outage":
                return "text-red-500 bg-red-500/10 border-red-500/20";
            case "maintenance":
                return "text-blue-500 bg-blue-500/10 border-blue-500/20";
            default:
                return "text-muted-foreground bg-muted/10 border-border/20";
        }
    };

    const getIcon = (id: string) => {
        switch (id) {
            case "cpu": return <Cpu className="w-5 h-5" />;
            case "memory": return <MemoryStick className="w-5 h-5" />;
            case "storage": return <HardDrive className="w-5 h-5" />;
            case "network": return <Activity className="w-5 h-5" />;
            default: return <Activity className="w-5 h-5" />;
        }
    };

    const Sparkline = ({ data, colorClass }: { data: number[], colorClass: string }) => {
        const max = Math.max(...data, 100);
        const min = 0;
        const range = max - min;

        // Create SVG path
        const points = data.map((val, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - ((val - min) / range) * 100;
            return `${x},${y}`;
        }).join(' ');

        // Fill area path
        const fillPoints = `0,100 ${points} 100,100`;

        // Extract color for the stroke/fill from the class or define explicit colors
        // For simplicity in this demo, we'll map status color classes to hex values
        let strokeColor = "#22c55e"; // green default
        if (colorClass.includes("yellow")) strokeColor = "#eab308";
        if (colorClass.includes("red")) strokeColor = "#ef4444";
        if (colorClass.includes("blue")) strokeColor = "#3b82f6";

        return (
            <div className="w-full h-16 relative overflow-hidden rounded-md">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                    <defs>
                        <linearGradient id={`gradient-${colorClass}`} x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
                            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d={fillPoints} fill={`url(#gradient-${colorClass})`} className="transition-all duration-300" />
                    <path d={`M${points}`} fill="none" stroke={strokeColor} strokeWidth="2" vectorEffect="non-scaling-stroke" className="transition-all duration-300" />
                </svg>
            </div>
        );
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 p-4">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">System Monitor</h2>
                    <p className="text-muted-foreground">Real-time infrastructure health and performance metrics</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isLive ? 'border-green-500/30 bg-green-500/5 text-green-600 dark:text-green-400' : 'border-muted bg-muted/50 text-muted-foreground'}`}>
                        <span className="relative flex h-2.5 w-2.5">
                            {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLive ? 'bg-green-500' : 'bg-muted-foreground'}`}></span>
                        </span>
                        <span className="text-sm font-medium">{isLive ? "Live Updates" : "Paused"}</span>
                    </div>

                    <button
                        onClick={() => setIsLive(!isLive)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {isLive ? "Pause" : "Resume"}
                    </button>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Metrics Overview */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {metrics.map((metric) => (
                        <motion.div
                            key={metric.id}
                            className={`relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md cursor-pointer ${selectedMetric === metric.id ? 'ring-2 ring-primary/20' : ''}`}
                            onClick={() => setSelectedMetric(metric.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${getStatusColor(metric.status).replace('text-', 'bg-').split(' ')[1]} bg-opacity-10`}>
                                        {getIcon(metric.id)}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground">{metric.name}</h3>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold">{metric.value}</span>
                                            <span className="text-sm text-muted-foreground">{metric.unit}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(metric.status)}`}>
                                    {metric.status.toUpperCase()}
                                </div>
                            </div>

                            <Sparkline data={metric.history} colorClass={getStatusColor(metric.status)} />

                        </motion.div>
                    ))}
                </div>

                {/* Right Column: Service Status */}
                <div className="bg-card rounded-xl border shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                        Service Status
                    </h3>

                    <div className="space-y-4">
                        {initialServices.map((service) => (
                            <div key={service.id} className="group">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${service.status === 'operational' ? 'bg-green-500' : service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                        <span className="font-medium text-sm">{service.name}</span>
                                    </div>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusColor(service.status)}`}>
                                        {service.status === 'operational' ? 'Operational' : service.status === 'degraded' ? 'Degraded' : 'Outage'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-xs text-muted-foreground pl-5 mb-2">
                                    <span>Uptime: {service.uptime}%</span>
                                    <span>Latency: {service.latency}ms</span>
                                </div>

                                {service.lastIncident && (
                                    <div className="ml-5 text-xs text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20 p-2 rounded border border-yellow-200 dark:border-yellow-800/30 flex items-start gap-2">
                                        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                                        {service.lastIncident}
                                    </div>
                                )}

                                <div className="border-b border-border/50 mt-3 group-last:border-0" />
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            <span>All systems operational</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Updated just now</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
