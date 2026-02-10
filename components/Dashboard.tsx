"use client";

import { PremiumStatCard } from "./dashboard/PremiumStatCard";
import { FileText, CheckCircle, Clock, AlertTriangle, TrendingUp, Podcast, ArrowUpRight, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { InventoryItem } from "@/lib/pipeline-data";
import { FinancialTable } from "./ui/financial-markets-table";
import SystemMonitor from "./ui/system-monitor";
import { LiveFeed } from "./dashboard/LiveFeed";

interface AirtableRecord {
    id: string;
    fields: {
        topic?: string;
        Topic?: string;
        "Title EN"?: string;
        title?: string;
        Status?: string;
        "Last Modified"?: string;
        [key: string]: any;
    };
}

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

export function Dashboard({ initialRecords, podcastEpisodes = [], wordpressInventory = [] }: { initialRecords: AirtableRecord[], podcastEpisodes?: any[], wordpressInventory?: InventoryItem[] }) {
    // Stats from WordPress
    const published = wordpressInventory.filter(i => i.status === 'published').length;
    const total = wordpressInventory.length;
    const publishedRate = total > 0 ? Math.round((published / total) * 100) : 0;

    // Stats from Airtable (Pipeline)
    const ready = initialRecords.filter(r => r.fields.Status === 'Ready').length;
    const errors = initialRecords.filter(r => r.fields.Status === 'Error').length;
    const inReview = initialRecords.filter(r => r.fields.Status === 'Review').length;

    const podcastCount = podcastEpisodes.filter(e => e.status === 'published').length;

    // Items that need attention (from Airtable)
    const actionItems = initialRecords.filter(r =>
        r.fields.Status === 'Error' || r.fields.Status === 'Review'
    );

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="max-w-[1600px] mx-auto space-y-10 pb-20">
            {/* Header: Welcome + Quick Summary */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white/40 backdrop-blur-md p-10 rounded-[32px] border border-white/40 shadow-xl"
            >
                <div className="space-y-2">
                    <p className="text-foreground/50 text-sm font-medium">{today}</p>
                    <h1 className="text-5xl font-bold font-heading tracking-tight text-foreground">
                        {getGreeting()}, Ben
                    </h1>
                    <p className="text-foreground/60 text-xl font-light">
                        Here's how your content is performing.
                    </p>
                </div>
                <div className="flex items-center gap-3 px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl text-sm font-semibold border border-emerald-200">
                    <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                    System Active
                </div>
            </motion.div>

            {/* Main Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">

                {/* LEFT: Content Scorecard */}
                <div className="xl:col-span-1 space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-8 rounded-[32px] text-white shadow-2xl relative overflow-hidden"
                    >
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-6">
                                <TrendingUp className="h-5 w-5 text-emerald-400" />
                                <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-white/60">Content Scorecard</h3>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <div className="text-5xl font-bold font-heading">{published}</div>
                                    <p className="text-sm text-white/50 mt-1">Articles live on website</p>
                                </div>

                                <div className="h-px bg-white/10" />

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-2xl font-bold">{total}</div>
                                        <p className="text-[11px] text-white/40">Total in library</p>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-emerald-400">{publishedRate}%</div>
                                        <p className="text-[11px] text-white/40">Success rate</p>
                                    </div>
                                </div>

                                <div className="h-px bg-white/10" />

                                <div className="flex items-center gap-3">
                                    <Podcast className="h-4 w-4 text-purple-400" />
                                    <div>
                                        <p className="text-sm font-semibold">{podcastCount > 0 ? 'Podcast Active' : 'Podcast Setup'}</p>
                                        <p className="text-[11px] text-white/40">{podcastCount} episodes published</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Action Items */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/60 backdrop-blur-md border border-white/40 rounded-[32px] overflow-hidden shadow-xl"
                    >
                        <div className="px-8 py-6 border-b border-border/20">
                            <h3 className="text-lg font-bold font-heading">Action Items</h3>
                            <p className="text-xs text-foreground/40 mt-1">Items that may need your attention</p>
                        </div>
                        <div className="p-6 space-y-3">
                            {actionItems.length === 0 ? (
                                <div className="text-center py-8">
                                    <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-foreground/60">All clear — nothing needs attention</p>
                                </div>
                            ) : (
                                actionItems.slice(0, 5).map((record) => {
                                    const title = record.fields["Title EN"] || record.fields.title || record.fields.Topic || record.fields.topic || record.fields.Headline || "Untitled Topic";
                                    const isError = record.fields.Status === 'Error';
                                    return (
                                        <div
                                            key={record.id}
                                            className={`flex flex-col gap-2 p-3 rounded-xl border ${isError
                                                ? 'bg-red-50/50 border-red-200/50'
                                                : 'bg-amber-50/50 border-amber-200/50'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isError ? 'text-red-500' : 'text-amber-500'
                                                    }`} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-foreground leading-snug truncate">{title}</p>
                                                    <p className="text-[11px] text-foreground/40 mt-0.5">
                                                        {isError ? 'Has an error — may need a retry' : 'Waiting for review'}
                                                    </p>
                                                </div>
                                            </div>

                                            {isError && (
                                                <button
                                                    onClick={async () => {
                                                        const id = record.id;
                                                        try {
                                                            const res = await fetch(`/api/pipeline/heal/${id}`, { method: 'POST' });
                                                            if (res.ok) alert("Healing started!");
                                                        } catch (e) {
                                                            alert("Failed to trigger heal");
                                                        }
                                                    }}
                                                    className="w-full py-1.5 bg-white rounded-lg border border-red-200 text-red-600 text-[10px] font-bold hover:bg-red-50 transition-colors uppercase tracking-wider"
                                                >
                                                    🚀 Run Heal
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                            {actionItems.length > 5 && (
                                <p className="text-xs text-foreground/40 text-center pt-2">
                                    +{actionItems.length - 5} more items
                                </p>
                            )}
                        </div>
                    </motion.div>

                    {/* System Monitor */}
                    <SystemMonitor />

                    {/* Live Feed Widget */}
                    <LiveFeed
                        activities={([
                            ...wordpressInventory.slice(0, 3).map(i => ({
                                id: i.id,
                                type: "wordpress" as const,
                                title: i.titleEn || i.titleHe,
                                timestamp: i.date,
                                url: i.url
                            })),
                            ...podcastEpisodes.slice(0, 2).map(e => ({
                                id: e.id,
                                type: "podcast" as const,
                                title: e.title,
                                timestamp: e.publishDate || "Live",
                                url: e.url
                            }))
                        ] as any[]).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())}
                    />
                </div>

                {/* CENTER/RIGHT: Stats & Content */}
                <div className="xl:col-span-3 space-y-8">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <PremiumStatCard
                            title="Content Library"
                            value={total}
                            icon={<FileText className="h-6 w-6" />}
                        />
                        <PremiumStatCard
                            title="Live on Website"
                            value={published}
                            trend={published > 0 ? `${publishedRate}%` : undefined}
                            icon={<CheckCircle className="h-6 w-6" />}
                        />
                        <PremiumStatCard
                            title="Coming Soon"
                            value={ready}
                            icon={<Clock className="h-6 w-6" />}
                        />
                        <PremiumStatCard
                            title="Needs Attention"
                            value={errors + inReview}
                            icon={<AlertTriangle className="h-6 w-6" />}
                        />
                    </div>

                    {/* Financial Markets */}
                    <FinancialTable />

                    {/* Recent Content - NOW USING WORDPRESS INVENTORY */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-white/60 backdrop-blur-md border border-white/40 rounded-[32px] overflow-hidden shadow-xl"
                    >
                        <div className="px-10 py-8 border-b border-border/40 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold font-heading">Recent Content</h2>
                                <p className="text-sm text-foreground/40 mt-1">Your latest articles and their status</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border/20">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-10 py-5 text-left text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em]">Article</th>
                                        <th className="px-10 py-5 text-left text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em]">Status</th>
                                        <th className="px-10 py-5 text-left text-[10px] font-bold text-foreground/40 uppercase tracking-[0.2em]">Published Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/10">
                                    {wordpressInventory.slice(0, 10).map((item) => (
                                        <tr key={item.id} className="hover:bg-white/40 transition-colors group">
                                            <td className="px-10 py-5">
                                                <div className="flex items-center gap-2 group">
                                                    <div className="font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                                                        {item.url ? (
                                                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                                                {item.titleEn || item.titleHe || "Untitled Article"}
                                                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </a>
                                                        ) : (
                                                            item.titleEn || item.titleHe || "Untitled Article"
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-foreground/40 mt-0.5">{item.titleHe}</div>
                                            </td>
                                            <td className="px-10 py-5">
                                                <StatusBadge status={item.status === 'published' ? 'Published' : 'Draft'} />
                                            </td>
                                            <td className="px-10 py-5 text-sm text-foreground/40 font-medium">
                                                {item.date}
                                            </td>
                                        </tr>
                                    ))}
                                    {wordpressInventory.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-10 py-8 text-center text-foreground/50">
                                                No content found in WordPress.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status?: string }) {
    const styles: Record<string, string> = {
        Published: "bg-emerald-50 text-emerald-700 border-emerald-200",
        Error: "bg-red-50 text-red-600 border-red-200",
        Review: "bg-amber-50 text-amber-600 border-amber-200",
        Generated: "bg-blue-50 text-blue-600 border-blue-200",
        Ready: "bg-violet-50 text-violet-600 border-violet-200",
        Draft: "bg-slate-50 text-slate-600 border-slate-200"
    };

    const labels: Record<string, string> = {
        Published: "Live",
        Error: "Issue",
        Review: "In Review",
        Generated: "Ready",
        Ready: "Ready",
        Draft: "Draft"
    };

    const style = styles[status || ""] || "bg-slate-50 text-slate-500 border-slate-200";

    return (
        <span className={`px-3.5 py-1.5 inline-flex text-xs font-semibold rounded-xl border ${style} transition-all`}>
            {labels[status || ""] || status || "Pending"}
        </span>
    );
}
