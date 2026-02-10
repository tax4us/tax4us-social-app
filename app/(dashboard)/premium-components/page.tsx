"use client";

import React from "react";
import { FinancialTable } from "@/components/ui/financial-markets-table";
import AgentPlan from "@/components/ui/agent-plan";
import SystemMonitor from "@/components/ui/system-monitor";
import ServerManagementTable from "@/components/ui/server-management-table";
import { motion } from "framer-motion";
import { Sparkles, Activity, ShieldCheck, Map } from "lucide-react";

export default function PremiumComponentsPage() {
    return (
        <div className="p-6 space-y-12 max-w-[1600px] mx-auto">

            {/* Page Header */}
            <div className="flex flex-col gap-4 mb-8">
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Premium Component Showcase
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl">
                    High-fidelity, interactive components designed for the Tax4Us Agentic Dashboard.
                    These components feature smooth animations, real-time state management, and responsive design.
                </p>
            </div>

            {/* 1. Financial Markets Table */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                        <Activity className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold">Financial Markets</h2>
                        <p className="text-muted-foreground">Real-time market data visualization with sparklines and algorithmic indicators.</p>
                    </div>
                </div>
                <div className="border border-border/50 rounded-2xl bg-muted/20 p-6 backdrop-blur-sm">
                    <FinancialTable title="Global Indices" />
                </div>
            </section>

            {/* 2. System Monitor */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <ShieldCheck className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold">System Monitor</h2>
                        <p className="text-muted-foreground">Live infrastructure health monitoring with animated metrics and status tracking.</p>
                    </div>
                </div>
                <div className="border border-border/50 rounded-2xl bg-muted/20 p-1 backdrop-blur-sm">
                    <SystemMonitor />
                </div>
            </section>

            {/* 3. Agent Plan */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Map className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold">Agent Plan Execution</h2>
                        <p className="text-muted-foreground">Hierarchical task management with progress tracking and recursive subtasks.</p>
                    </div>
                </div>
                <div className="h-[600px] border border-border/50 rounded-2xl bg-muted/20 overflow-hidden backdrop-blur-sm">
                    <AgentPlan />
                </div>
            </section>

            {/* 4. Server Management */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                        <Sparkles className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold">Server Management</h2>
                        <p className="text-muted-foreground">Interactive fleet management with power controls and resource visualization.</p>
                    </div>
                </div>
                <div className="border border-border/50 rounded-2xl bg-muted/20 p-1 backdrop-blur-sm">
                    <ServerManagementTable />
                </div>
            </section>

        </div>
    );
}
