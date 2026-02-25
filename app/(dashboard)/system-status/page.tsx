"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Globe,
    Mic2,
    Palette,
    RefreshCw,
    Share2,
    Server,
    Clock,
    Database
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { WorkerStatusBoard } from "@/components/pipeline/WorkerStatusBoard";

interface IntegrationStatus {
    status: "operational" | "failed" | "checking";
    message: string;
    lastChecked: string;
}

interface SystemHealth {
    success: boolean;
    healthScore: number;
    operational: number;
    total: number;
    integrations: Record<string, IntegrationStatus>;
    timestamp: string;
}

const INTEGRATION_CONFIGS = {
    wordpress: {
        name: "WordPress",
        icon: Globe,
        description: "Content publishing platform",
        color: "#21759b"
    },
    elevenlabs: {
        name: "ElevenLabs",
        icon: Mic2,
        description: "Text-to-speech synthesis",
        color: "#ff6b35"
    },
    captivate: {
        name: "Captivate",
        icon: Server,
        description: "Podcast hosting platform",
        color: "#1db954"
    },
    facebook: {
        name: "Facebook",
        icon: Share2,
        description: "Social media publishing",
        color: "#1877f2"
    },
    linkedin: {
        name: "LinkedIn",
        icon: Share2,
        description: "Professional social network",
        color: "#0a66c2"
    },
    kie: {
        name: "Kie.ai",
        icon: Palette,
        description: "AI media generation",
        color: "#7c3aed"
    }
};

export default function SystemStatusPage() {
    const [healthData, setHealthData] = useState<SystemHealth | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    const fetchSystemHealth = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/integrations/status');
            const data = await response.json();
            setHealthData(data);
            setLastRefresh(new Date());
        } catch (error) {
            console.error('Failed to fetch system health:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSystemHealth();
        const interval = setInterval(fetchSystemHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "operational":
                return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
            case "failed":
                return "text-rose-500 bg-rose-500/10 border-rose-500/20";
            case "checking":
                return "text-amber-500 bg-amber-500/10 border-amber-500/20";
            default:
                return "text-muted-foreground bg-muted/10 border-border/20";
        }
    };

    const getHealthScoreColor = (score: number) => {
        if (score >= 80) return "text-emerald-500";
        if (score >= 60) return "text-amber-500";
        return "text-rose-500";
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">System Status</h1>
                    <p className="text-muted-foreground">Real-time integration health monitoring</p>
                </div>
                <button
                    onClick={fetchSystemHealth}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    disabled={isLoading}
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Overall Health Score */}
            {healthData && (
                <Card className="border-primary/20">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${getStatusColor(healthData.healthScore >= 80 ? 'operational' : healthData.healthScore >= 60 ? 'checking' : 'failed')}`}>
                                    <Activity className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">System Health</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {healthData.operational} of {healthData.total} integrations operational
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-3xl font-bold ${getHealthScoreColor(healthData.healthScore)}`}>
                                    {healthData.healthScore}%
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Last updated: {lastRefresh?.toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Integration Matrix */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Integration Status Matrix
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    {isLoading && !healthData ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : healthData ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(INTEGRATION_CONFIGS).map(([key, config]) => {
                                const integration = healthData.integrations[key];
                                const Icon = config.icon;
                                
                                return (
                                    <motion.div
                                        key={key}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                                            integration?.status === 'operational'
                                                ? 'border-emerald-200 bg-emerald-50/50'
                                                : integration?.status === 'failed'
                                                ? 'border-rose-200 bg-rose-50/50'
                                                : 'border-amber-200 bg-amber-50/50'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="p-2 rounded-lg"
                                                style={{ backgroundColor: `${config.color}15` }}
                                            >
                                                <Icon
                                                    className="h-5 w-5"
                                                    style={{ color: config.color }}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-sm">{config.name}</h3>
                                                    {integration?.status === 'operational' ? (
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                    ) : integration?.status === 'failed' ? (
                                                        <AlertCircle className="h-4 w-4 text-rose-500" />
                                                    ) : (
                                                        <Clock className="h-4 w-4 text-amber-500" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    {config.description}
                                                </p>
                                                {integration && (
                                                    <div className={`text-xs px-2 py-1 rounded ${getStatusColor(integration.status)}`}>
                                                        {integration.status === 'operational' && 'Connected'}
                                                        {integration.status === 'failed' && 'Disconnected'}
                                                        {integration.status === 'checking' && 'Checking...'}
                                                    </div>
                                                )}
                                                {integration?.message && integration.status === 'failed' && (
                                                    <p className="text-xs text-rose-600 mt-2 break-words">
                                                        {integration.message}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            Failed to load integration status
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Worker Status Board */}
            <Card>
                <CardHeader>
                    <CardTitle>Pipeline Workers</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <WorkerStatusBoard />
                </CardContent>
            </Card>
        </div>
    );
}