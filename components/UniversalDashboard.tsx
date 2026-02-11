"use client"

import React from "react"
import {
    LayoutDashboard,
    FileText,
    Users,
    Zap,
    TrendingUp,
    Clock,
    AlertCircle,
    ArrowUpRight,
    Search,
    Filter,
    MoreHorizontal,
    Plus,
    CheckCircle2,
    Play
} from "lucide-react"

import { PremiumStatCard } from "@/components/dashboard/PremiumStatCard"
import { ActivityChart } from "@/components/dashboard/ActivityChart"
import { LogConsole } from "@/components/dashboard/LogConsole"
import { LiveFeed } from "@/components/dashboard/LiveFeed"
import { CostMonitor } from "@/components/dashboard/CostMonitor"
import type { CostSummary } from "@/lib/services/api-costs"
import SystemMonitor from "@/components/ui/system-monitor"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { PipelineItem, Status as PipelineStatus } from "@/lib/pipeline-data";

export type Status = PipelineStatus;

interface DashboardProps {
    wordpressInventory: any[];
    podcastEpisodes: any[];
    initialRecords: PipelineItem[];
    costData?: CostSummary;
}

export function Dashboard({ wordpressInventory, podcastEpisodes, initialRecords, costData }: DashboardProps) {
    // Correctly categorize records
    const readyToProcess = initialRecords.filter(r => r.status === 'pending');
    const inReview = initialRecords.filter(r => r.status === 'waiting-approval');
    const recentActivities = initialRecords.slice(0, 5);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent italic">
                        Universal Agent Dashboard
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs font-mono">v1.0.0 • B.L.A.S.T.</Badge>
                        <span className="text-muted-foreground text-sm flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            System Active: All nodes operational
                        </span>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" className="hidden md:flex">
                        <Filter className="mr-2 h-4 w-4" />
                        Filters
                    </Button>
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                        <Plus className="mr-2 h-4 w-4" />
                        New Topic
                    </Button>
                </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <PremiumStatCard
                    title="Articles Live"
                    value={wordpressInventory.length.toString()}
                    description="Total Published Across WP"
                    icon={<FileText className="h-4 w-4" />}
                    trend="+12% this month"
                />
                <PremiumStatCard
                    title="Active Pipeline"
                    value={initialRecords.length.toString()}
                    description="Records in System"
                    icon={<Zap className="h-4 w-4" />}
                    trend="Ready for processing"
                />
                <PremiumStatCard
                    title="Success Rate"
                    value="98.2%"
                    description="Node execution accuracy"
                    icon={<TrendingUp className="h-4 w-4" />}
                    trend="+2.1% improvement"
                />
                <PremiumStatCard
                    title="Active Agents"
                    value="4"
                    description="Content, Media, Social, SEO"
                    icon={<Users className="h-4 w-4" />}
                    trend="All agents nominal"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Main Content Feed / Queue */}
                <Card className="col-span-4 border-primary/10 shadow-lg bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center">
                        <div className="grid gap-0.5">
                            <CardTitle className="text-xl">Content Pipeline</CardTitle>
                            <CardDescription>Real-time status of your content factory</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" className="ml-auto">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {initialRecords.map((item) => (
                                <div key={item.id} className="group relative flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all duration-200">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full ${item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                            item.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                                'bg-primary/10 text-primary'
                                            }`}>
                                            {item.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold leading-none">{item.topic}</p>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="text-[10px] py-0 px-1">{item.stage}</Badge>
                                                <span className="text-[10px] text-muted-foreground">{item.lastUpdated}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        {/* Gate Status Visualizer */}
                                        <div className="hidden sm:flex items-center gap-1.5 opacity-60">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className={`h-1 w-4 rounded-full ${i === 0 && item.gates.topicApproved ? 'bg-emerald-500' :
                                                    i === 1 && item.gates.hebrewContentApproved ? 'bg-emerald-500' :
                                                        i === 2 && item.gates.videoApproved ? 'bg-emerald-500' :
                                                            i === 3 && item.gates.linkedinApproved ? 'bg-emerald-500' :
                                                                i === 4 && item.gates.facebookApproved ? 'bg-emerald-500' :
                                                                    'bg-muted'
                                                    }`} />
                                            ))}
                                        </div>
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-primary/20 hover:text-primary">
                                            <Play className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* System Activity & Monitoring */}
                <div className="col-span-3 space-y-4">
                    <Card className="border-primary/10 shadow-md">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-500" />
                                Live Feed
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-2">
                            <LiveFeed
                                activities={([
                                    ...wordpressInventory.slice(0, 3).map(i => ({
                                        id: i.id,
                                        type: "wordpress" as const,
                                        title: i.titleEn || i.titleHe,
                                        timestamp: i.date,
                                        url: i.url,
                                        rawDate: new Date(i.rawDate)
                                    })),
                                    ...podcastEpisodes.slice(0, 2).map(e => ({
                                        id: e.id,
                                        type: "podcast" as const,
                                        title: e.title,
                                        timestamp: e.publishDate || "Live",
                                        url: e.url,
                                        rawDate: new Date(e.rawDate || Date.now())
                                    }))
                                ] as any[]).sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())}
                            />
                        </CardContent>
                    </Card>

                    {costData && <CostMonitor costData={costData} />}

                    <SystemMonitor />
                </div>
            </div>

            <div className="mt-8">
                <Card className="border-primary/5 bg-muted/30 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-md font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-primary" />
                            Agent Logs
                        </CardTitle>
                        <Button variant="outline" size="xs" className="h-7 text-[10px]">Clear Console</Button>
                    </CardHeader>
                    <CardContent>
                        <LogConsole className="h-[250px]" />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
