"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Server,
    Power,
    RefreshCw,
    Terminal,
    MoreVertical,
    Cpu,
    HardDrive,
    Shield,
    Activity,
    PlayCircle,
    StopCircle,
    RotateCcw
} from "lucide-react";

// Types
interface ServerNode {
    id: string;
    name: string;
    type: "production" | "staging" | "development" | "database";
    region: string;
    status: "running" | "stopped" | "starting" | "stopping" | "error";
    ip: string;
    cpu: number;
    memory: number;
    disk: number;
    uptime: string;
}

// Mock Data
const initialServers: ServerNode[] = [
    {
        id: "srv-01",
        name: "Web-Prod-01",
        type: "production",
        region: "us-east-1",
        status: "running",
        ip: "10.0.1.15",
        cpu: 45,
        memory: 62,
        disk: 28,
        uptime: "14d 2h 15m"
    },
    {
        id: "srv-02",
        name: "Web-Prod-02",
        type: "production",
        region: "us-east-1",
        status: "running",
        ip: "10.0.1.16",
        cpu: 38,
        memory: 58,
        disk: 25,
        uptime: "14d 2h 10m"
    },
    {
        id: "srv-03",
        name: "Worker-Queue-01",
        type: "production",
        region: "us-east-1",
        status: "starting",
        ip: "10.0.2.5",
        cpu: 12,
        memory: 30,
        disk: 15,
        uptime: "2m 30s"
    },
    {
        id: "db-01",
        name: "Primary-DB-Cluster",
        type: "database",
        region: "us-east-1",
        status: "running",
        ip: "10.0.3.10",
        cpu: 65,
        memory: 82,
        disk: 60,
        uptime: "45d 12h 00m"
    },
    {
        id: "stg-01",
        name: "Staging-App",
        type: "staging",
        region: "us-west-2",
        status: "stopped",
        ip: "10.1.1.5",
        cpu: 0,
        memory: 0,
        disk: 10,
        uptime: "-"
    },
    {
        id: "dev-01",
        name: "Dev-Sandbox",
        type: "development",
        region: "eu-central-1",
        status: "error",
        ip: "10.2.1.8",
        cpu: 5,
        memory: 10,
        disk: 8,
        uptime: "3h 45m"
    }
];

export default function ServerManagementTable() {
    const [servers, setServers] = useState<ServerNode[]>(initialServers);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);

    const handleAction = (id: string, action: "start" | "stop" | "restart") => {
        setServers(prev => prev.map(server => {
            if (server.id === id) {
                if (action === "start") return { ...server, status: "starting" };
                if (action === "stop") return { ...server, status: "stopping" };
                if (action === "restart") return { ...server, status: "starting" };
            }
            return server;
        }));

        // Simulate completion
        setTimeout(() => {
            setServers(prev => prev.map(server => {
                if (server.id === id) {
                    if (action === "start" || action === "restart") return { ...server, status: "running" };
                    if (action === "stop") return { ...server, status: "stopped", cpu: 0, memory: 0 };
                }
                return server;
            }));
        }, 2000);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "running": return "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]";
            case "starting": return "bg-blue-500 animate-pulse";
            case "stopping": return "bg-orange-500 animate-pulse";
            case "stopped": return "bg-gray-400 dark:bg-gray-600";
            case "error": return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]";
            default: return "bg-gray-400";
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            running: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
            starting: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
            stopping: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
            stopped: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200 dark:border-gray-700",
            error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
        };
        return styles[status as keyof typeof styles] || styles.stopped;
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "production": return <Shield className="w-4 h-4 text-purple-500" />;
            case "database": return <HardDrive className="w-4 h-4 text-blue-500" />;
            default: return <Server className="w-4 h-4 text-gray-500" />;
        }
    };

    const ResourceBar = ({ value, color = "bg-primary" }: { value: number, color?: string }) => (
        <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
                className={`h-full rounded-full ${color}`}
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
            />
        </div>
    );

    return (
        <div className="w-full max-w-7xl mx-auto p-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Server Management</h2>
                    <p className="text-muted-foreground">Manage and monitor fleet instances</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                    <Terminal className="w-4 h-4" />
                    <span>New Instance</span>
                </button>
            </div>

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">Instance Name</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Resources</th>
                                <th className="px-6 py-4">IP Address</th>
                                <th className="px-6 py-4">Uptime</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {servers.map((server) => (
                                <tr
                                    key={server.id}
                                    className={`group transition-colors hover:bg-muted/30 ${selectedServer === server.id ? 'bg-muted/50' : ''}`}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-background border shadow-xs">
                                                {getTypeIcon(server.type)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-foreground">{server.name}</div>
                                                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{server.region}</div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium capitalize ${getStatusBadge(server.status)}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(server.status).split(' ')[0]}`} />
                                            {server.status}
                                        </span>
                                    </td>

                                    <td className="px-6 py-4 space-y-2">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Cpu className="w-3 h-3" />
                                            <span className="w-8">{server.cpu}%</span>
                                            <ResourceBar value={server.cpu} color={server.cpu > 80 ? "bg-red-500" : "bg-blue-500"} />
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Activity className="w-3 h-3" />
                                            <span className="w-8">{server.memory}%</span>
                                            <ResourceBar value={server.memory} color={server.memory > 80 ? "bg-yellow-500" : "bg-purple-500"} />
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                                        {server.ip}
                                    </td>

                                    <td className="px-6 py-4 text-muted-foreground">
                                        {server.uptime}
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {server.status === "running" && (
                                                <>
                                                    <button
                                                        onClick={() => handleAction(server.id, "restart")}
                                                        title="Restart"
                                                        className="p-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors"
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(server.id, "stop")}
                                                        title="Stop"
                                                        className="p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                                                    >
                                                        <Power className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}

                                            {server.status === "stopped" && (
                                                <button
                                                    onClick={() => handleAction(server.id, "start")}
                                                    title="Start"
                                                    className="p-2 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 transition-colors"
                                                >
                                                    <PlayCircle className="w-4 h-4" />
                                                </button>
                                            )}

                                            <button className="p-2 rounded-md hover:bg-muted text-muted-foreground transition-colors">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
