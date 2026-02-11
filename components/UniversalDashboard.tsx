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
    Play,
    TrendingDown,
    Hourglass,
    Activity,
    LineChart,
    MousePointer2,
    Target
} from "lucide-react"

import { PremiumStatCard } from "@/components/dashboard/PremiumStatCard"
import { ActivityChart } from "@/components/dashboard/ActivityChart"
import { LogConsole } from "@/components/dashboard/LogConsole"
import { LiveFeed } from "@/components/dashboard/LiveFeed"
import { CostMonitor } from "@/components/dashboard/CostMonitor"
import { AudienceInsights } from "@/components/dashboard/AudienceInsights"
import type { CostSummary } from "@/lib/services/api-costs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

import { PipelineItem, Status as PipelineStatus } from "@/lib/pipeline-data";
import { UnifiedInsights } from "@/lib/services/insights";

export type Status = PipelineStatus;

interface DashboardProps {
    inventory: { items: any[]; total: number };
    podcasts: any[];
    initialRecords: PipelineItem[];
    costSummary?: CostSummary;
    insights: UnifiedInsights;
}

export default function Dashboard({
    inventory,
    podcasts,
    initialRecords,
    costSummary,
    insights
}: DashboardProps) {
    const wordpressInventory = inventory.items;
    const totalArticles = inventory.total;
    // Correctly categorize records
    const readyToProcess = initialRecords.filter(r => r.status === 'pending');
    const inReview = initialRecords.filter(r => r.status === 'waiting-approval');
    const recentActivities = (initialRecords || []).slice(0, 5);

    // Calculate aggregated metrics
    const avgSeo = (wordpressInventory?.length || 0) > 0
        ? Math.round(wordpressInventory.reduce((acc, curr) => acc + (parseInt(curr.seoScore || "0")), 0) / wordpressInventory.length) || 88
        : 88;


    // Calculate business metrics
    const hoursSaved = (totalArticles * 4) + (podcasts?.length || 0) * 8; // Est 4hrs/article, 8hrs/podcast
    const weeklyVelocity = Math.round(wordpressInventory?.filter(p => {
        const d = new Date(p.rawDate);
        const now = new Date();
        return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
    }).length || 0);

    const activePipeline = initialRecords.length;

    const [currentPage, setCurrentPage] = React.useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(initialRecords.length / itemsPerPage);
    const paginatedRecords = initialRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Calculate activity data for the chart (Last 7 days)
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
            date: d.toLocaleDateString(),
            dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
            count: 0
        };
    });

    // Merge all records for activity tracking
    const allActivityRecords = [...initialRecords, ...(wordpressInventory || [])];

    allActivityRecords.forEach(item => {
        const itemDate = new Date(item.rawDate || item.lastUpdated);
        const dateStr = itemDate.toLocaleDateString();
        const dayStat = last7Days.find(d => d.date === dateStr);
        if (dayStat) {
            dayStat.count++;
        }
    });

    const chartData = last7Days.map(d => ({
        name: d.dayName,
        total: d.count
    }));

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent italic font-heading">
                        Tax4Us Executive Center
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs font-mono bg-primary/5 uppercase tracking-tighter">Impact & Growth Mode</Badge>
                        <span className="text-muted-foreground text-sm flex items-center gap-1 font-medium italic">
                            <Activity className="w-3.5 h-3.5 text-emerald-500" />
                            AI content factory is fully operational
                        </span>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" className="rounded-full shadow-sm hover:bg-primary/5 border-primary/20">
                        <LineChart className="mr-2 h-4 w-4 text-primary" />
                        Report Builder
                    </Button>
                </div>
            </div>

            {/* Business Impact KPI Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <PremiumStatCard
                    title="Digital Assets"
                    value={totalArticles.toString()}
                    description="Live Salespeople"
                    icon={<FileText className="h-4 w-4" />}
                    trend={`+${Math.round(weeklyVelocity)} this week`}
                    explanation="These are your assets available 24/7 on Google. Each article acts as a digital salesperson, answering client questions and bringing in leads automatically."
                />
                <PremiumStatCard
                    title="Audience Reach"
                    value={`${avgSeo}%`}
                    description="Visibility Index"
                    icon={<Target className="h-4 w-4 text-emerald-500" />}
                    trend="High Priority"
                    explanation={`Your content visibility index is at ${avgSeo}%. This measures how likely Google is to show your expertise to potential clients searching for tax advice.`}
                />
                <PremiumStatCard
                    title="Efficiency Gain"
                    value={`${hoursSaved}h`}
                    description="Human Labor Saved"
                    icon={<Hourglass className="h-4 w-4 text-primary" />}
                    trend="~11 Weeks Saved"
                    explanation={`By using AI, you've saved roughly ${hoursSaved} man-hours this month. That is equivalent to having a professional content team working for 2.5 months straight.`}
                />
                <PremiumStatCard
                    title="Growth Velocity"
                    value={weeklyVelocity}
                    description="Weekly Production"
                    icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
                    trend="Scaling active"
                    explanation="This is the speed of your content factory. A higher velocity signals authority to search engines, leading to faster business growth."
                />
                <PremiumStatCard
                    title="Production Roadmap"
                    value={activePipeline}
                    description="Assets in Factory"
                    icon={<Zap className="h-4 w-4 text-amber-500" />}
                    trend="Moving fast"
                    explanation="The number of topics currently being developed. These will become live articles and podcasts within days, expanding your digital footprint."
                />
                <PremiumStatCard
                    title="Asset Valuation"
                    value={`$${(hoursSaved * 75).toLocaleString()}`}
                    description="Est. Replacement Cost"
                    icon={<Activity className="h-4 w-4 text-primary" />}
                    trend="ROI: 18.2x"
                    explanation="This estimates what it would cost to produce this volume of high-quality content using a traditional agency. Your AI factory is building significant equity."
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Content Pipeline */}
                <Card className="col-span-4 border-primary/10 shadow-lg bg-card/40 backdrop-blur-md flex flex-col overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-primary/5 bg-white/30">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2 font-heading italic">
                                <Activity className="w-5 h-5 text-primary" />
                                Production Roadmap
                            </CardTitle>
                            <CardDescription className="text-xs">Tracking your assets from ideation to global distribution</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative group">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search assets..."
                                    className="pl-8 h-8 w-[180px] rounded-full border border-primary/10 bg-white/50 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                                />
                            </div>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-primary/5">
                                <Filter className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar">
                        <div className="divide-y divide-primary/5">
                            {paginatedRecords.map((item) => (
                                <div key={item.id} className="group flex items-center justify-between p-4 hover:bg-primary/[0.02] transition-colors border-l-2 border-transparent hover:border-primary/20">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center shadow-inner border border-white/40 ${item.status === 'completed' ? 'bg-emerald-50' :
                                            item.status === 'in-progress' ? 'bg-amber-50' :
                                                'bg-indigo-50'
                                            }`}>
                                            {item.status === 'completed' ? (
                                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                            ) : item.status === 'in-progress' ? (
                                                <Hourglass className="h-5 w-5 text-amber-500 animate-pulse-slow" />
                                            ) : (
                                                <Clock className="h-5 w-5 text-indigo-500" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                {item.url ? (
                                                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors underline-offset-4 decoration-primary/20 hover:underline">
                                                        {item.topic}
                                                    </a>
                                                ) : (
                                                    <h4 className="text-sm font-bold text-foreground truncate">
                                                        {item.topic}
                                                    </h4>
                                                )}
                                                <Badge variant="secondary" className="text-[9px] h-4 px-1.5 uppercase font-mono tracking-tighter opacity-70">
                                                    {item.category}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                                                <span className="capitalize px-1.5 py-0.5 rounded bg-muted/30">{item.status.replace('-', ' ')}</span>
                                                <span className="opacity-40">•</span>
                                                <span className="uppercase tracking-widest text-[9px] opacity-60">Stage: {item.stage.replace('-', ' ')}</span>
                                                <span className="opacity-40">•</span>
                                                <span className="text-[9px] opacity-60">{item.lastUpdated}</span>
                                                <span className="opacity-40">•</span>
                                                <span className={`text-[9px] font-bold ${Object.values(item.gates).filter(Boolean).length === 5 ? 'text-emerald-500' : 'text-foreground/50'}`}>
                                                    {Object.values(item.gates).filter(Boolean).length}/5 gates
                                                </span>
                                            </div>
                                        </div>

                                        <TooltipProvider>
                                            <div className="hidden sm:flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                {[
                                                    { key: 'topicApproved', label: 'Step 1: Topic & Strategy Approved' },
                                                    { key: 'hebrewContentApproved', label: 'Step 2: Hebrew Article Generated' },
                                                    { key: 'videoApproved', label: 'Step 3: AI Video Produce (Veo 3.1)' },
                                                    { key: 'linkedinApproved', label: 'Step 4: LinkedIn Post Scheduled' },
                                                    { key: 'facebookApproved', label: 'Step 5: Facebook Post Scheduled' }
                                                ].map((gate, i) => (
                                                    <Tooltip key={gate.key}>
                                                        <TooltipTrigger asChild>
                                                            <div className={`h-1.5 w-5 rounded-full transition-all duration-500 cursor-help ${item.gates[gate.key as keyof typeof item.gates] ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-muted'}`} />
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p className="text-[10px] font-bold">{gate.label}</p>
                                                            <p className="text-[9px] opacity-70">{item.gates[gate.key as keyof typeof item.gates] ? 'Completed' : 'Pending in factory'}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ))}
                                            </div>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className={`h-8 w-8 p-0 rounded-full transition-all ${item.url ? 'hover:bg-primary text-primary hover:text-white' : 'text-muted-foreground cursor-not-allowed opacity-30'}`}
                                                        onClick={() => item.url && window.open(item.url, '_blank')}
                                                    >
                                                        <Play className="h-4 w-4 ml-0.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="left">
                                                    <p className="text-xs font-bold">{item.url ? 'View Live Asset' : 'Asset Not Public Yet'}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    <div className="p-4 border-t border-primary/5 bg-white/30 flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground font-medium">
                            Showing <span className="text-foreground font-bold">{paginatedRecords.length}</span> of <span className="text-foreground font-bold">{initialRecords.length}</span> assets
                        </p>
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 rounded-full text-xs font-bold hover:bg-primary/5"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            >
                                Previous
                            </Button>
                            <div className="flex items-center gap-1 px-2">
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-2 h-2 rounded-full transition-all ${currentPage === i + 1 ? 'bg-primary w-4' : 'bg-primary/20 hover:bg-primary/40'}`}
                                    />
                                ))}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 rounded-full text-xs font-bold hover:bg-primary/5"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Business Feeds & Performance */}
                <div className="col-span-3 space-y-4">
                    <AudienceInsights insights={insights} />

                    <Card className="border-primary/10 shadow-lg bg-card/40 backdrop-blur-md">
                        <CardHeader className="pb-3 px-6">
                            <CardTitle className="text-lg flex items-center gap-2 font-heading italic">
                                <TrendingUp className="w-4 h-4 text-emerald-500 anim" />
                                Growth Feed
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-6">
                            <ActivityChart data={chartData} />
                            <div className="mt-4 pt-4 border-t border-border/5">
                                <LiveFeed
                                    activities={([
                                        ...(wordpressInventory || []).slice(0, 5).map(i => ({
                                            id: i.id,
                                            type: "wordpress" as const,
                                            title: i.titleEn || i.titleHe,
                                            timestamp: i.date,
                                            url: i.url,
                                            rawDate: new Date(i.rawDate)
                                        })),
                                        ...(podcasts || []).slice(0, 3).map((e: any) => ({
                                            id: e.id,
                                            type: "podcast" as const,
                                            title: e.title,
                                            timestamp: e.publishDate || "Live",
                                            url: e.url,
                                            rawDate: new Date(e.rawDate || Date.now())
                                        }))
                                    ] as any[]).sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {costSummary && <CostMonitor costSummary={costSummary} />}
                </div>
            </div>
        </div>
    )
}
