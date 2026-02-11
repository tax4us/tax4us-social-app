"use client"

import React, { useState } from "react"
import { Bot, Share2, Mic, Zap, ChevronDown, ChevronUp, Terminal } from "lucide-react"
import { GeneratorCard } from "@/components/dashboard/GeneratorCard"
import { LogConsole } from "@/components/dashboard/LogConsole"
import { Button } from "@/components/ui/button"

export default function FactoryControlsPage() {
    const [showLogs, setShowLogs] = useState(false);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground font-heading italic">Factory Controls</h2>
                    <p className="text-muted-foreground text-sm font-medium">
                        Direct your AI agents to produce, repurpose, or scale your digital footprint.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowLogs(!showLogs)}
                    className="rounded-full border-primary/20 hover:bg-primary/5 font-bold"
                >
                    <Terminal className="mr-2 h-4 w-4 text-primary" />
                    {showLogs ? "Hide Logic Stream" : "View Logic Stream"}
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <GeneratorCard
                    title="Full Production Run"
                    description="Executes the complete content production workflow for all ready topics."
                    icon={<Bot className="h-6 w-6 text-primary" />}
                    endpoint="/api/pipeline/cron"
                />
                <GeneratorCard
                    title="Manual Asset Trigger"
                    description="Force the production workflow for a specific content record."
                    icon={<Zap className="h-6 w-6 text-amber-500" />}
                    endpoint="/api/pipeline/run"
                    inputType="topicId"
                />
                <GeneratorCard
                    title="Social Outreach Echo"
                    description="AI repurposing for LinkedIn and Facebook based on live site content."
                    icon={<Share2 className="h-6 w-6 text-emerald-500" />}
                    endpoint="/api/pipeline/run?type=social"
                    inputType="topicId"
                />
                <GeneratorCard
                    title="Podcast Lab"
                    description="Trigger AI script generation and high-fidelity vocal synthesis."
                    icon={<Mic className="h-6 w-6 text-indigo-500" />}
                    endpoint="/api/pipeline/run?type=podcast"
                    inputType="topicId"
                />
                <GeneratorCard
                    title="Accuracy Auditor"
                    description="Scans for incomplete data and enriches records with AI-validated info."
                    icon={<Zap className="h-6 w-6 text-yellow-400" />}
                    endpoint="/api/pipeline/heal"
                />
            </div>

            {showLogs && (
                <div className="mt-8 animate-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2 font-heading">
                        <Terminal className="h-5 w-5 text-primary" />
                        Agent Logic Stream
                    </h3>
                    <LogConsole className="h-[400px] border-primary/10 shadow-inner rounded-2xl overflow-hidden" />
                </div>
            )}
        </div>
    )
}
