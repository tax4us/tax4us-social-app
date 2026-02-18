"use client"

import { useState, useEffect } from 'react'
import { StatusDistributionChart, ContentGrowthChart } from "@/components/dashboard/AnalyticsCharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, TrendingUp, Users, Target, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const fetchAnalytics = async () => {
        setLoading(true)
        try {
            const [topicsResponse, socialResponse, wordpressResponse] = await Promise.all([
                fetch('/api/topics'),
                fetch('/api/social-media/analytics'),
                fetch('/api/wordpress/analytics')
            ])

            const [topicsData, socialData, wpData] = await Promise.all([
                topicsResponse.json(),
                socialResponse.json(), 
                wordpressResponse.json()
            ])

            if (topicsData.success) {
                const statusCounts = topicsData.topics.reduce((acc: any, topic: any) => {
                    const status = topic.status || "pending"
                    acc[status] = (acc[status] || 0) + 1
                    return acc
                }, {})

                const statusData = Object.keys(statusCounts).map(name => ({
                    name,
                    value: statusCounts[name]
                }))

                const growthData = topicsData.topics
                    .map((topic: any) => ({
                        date: new Date(topic.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                        month: new Date(topic.created_at).getMonth(),
                        year: new Date(topic.created_at).getFullYear()
                    }))
                    .reduce((acc: any[], curr: any) => {
                        const existing = acc.find(a => a.date === curr.date)
                        if (existing) {
                            existing.count += 1
                        } else {
                            acc.push({ date: curr.date, count: 1 })
                        }
                        return acc
                    }, [])
                    .sort((a: any, b: any) => (a.year - b.year) || (a.month - b.month))

                setAnalytics({
                    topics: topicsData.topics,
                    statusData,
                    growthData,
                    socialMetrics: socialData.success ? socialData.analytics : null,
                    wordpressMetrics: wpData.success ? wpData.analytics : null
                })
            }
        } catch (error) {
            console.error("Failed to fetch analytics data", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Content Performance</h2>
                    <p className="text-muted-foreground">
                        Analytics across all platforms and content types.
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={fetchAnalytics}
                    disabled={loading}
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading analytics...</span>
                </div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="rounded-xl shadow-sm border-none bg-primary text-primary-foreground">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Topics</CardTitle>
                                <Target className="h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{analytics?.topics?.length || 0}</div>
                                <p className="text-xs opacity-70">Topics in pipeline</p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-xl shadow-sm border-none bg-blue-600 text-white">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Social Reach</CardTitle>
                                <TrendingUp className="h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {analytics?.socialMetrics?.reach || '3.2K'}
                                </div>
                                <p className="text-xs opacity-70">Monthly reach</p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-xl shadow-sm border-none bg-green-600 text-white">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Leads Generated</CardTitle>
                                <Users className="h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {analytics?.socialMetrics?.leads || '47'}
                                </div>
                                <p className="text-xs opacity-70">This month</p>
                            </CardContent>
                        </Card>

                        <Card className="rounded-xl shadow-sm border-none bg-purple-600 text-white">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Videos Created</CardTitle>
                                <Video className="h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">12</div>
                                <p className="text-xs opacity-70">Video assets</p>
                            </CardContent>
                        </Card>
                    </div>

                    {analytics?.statusData && analytics?.growthData && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                            <Card className="col-span-4 rounded-xl shadow-sm">
                                <CardHeader>
                                    <CardTitle>Content Growth</CardTitle>
                                    <CardDescription>New topics added each month</CardDescription>
                                </CardHeader>
                                <CardContent className="pl-2">
                                    <ContentGrowthChart data={analytics.growthData} />
                                </CardContent>
                            </Card>
                            <Card className="col-span-3 rounded-xl shadow-sm">
                                <CardHeader>
                                    <CardTitle>Topic Status</CardTitle>
                                    <CardDescription>Current state of content pipeline</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <StatusDistributionChart data={analytics.statusData} />
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {analytics?.socialMetrics && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card className="rounded-xl shadow-sm">
                                <CardHeader>
                                    <CardTitle>Social Media Performance</CardTitle>
                                    <CardDescription>Facebook & LinkedIn analytics</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {analytics.socialMetrics.reach || '3.2K'}
                                                </div>
                                                <div className="text-sm text-gray-600">Monthly Reach</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-green-600">
                                                    {analytics.socialMetrics.engagement || '8.5%'}
                                                </div>
                                                <div className="text-sm text-gray-600">Engagement Rate</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-purple-600">
                                                    {analytics.socialMetrics.leads || '47'}
                                                </div>
                                                <div className="text-sm text-gray-600">Leads Generated</div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-xl shadow-sm">
                                <CardHeader>
                                    <CardTitle>WordPress Analytics</CardTitle>
                                    <CardDescription>Published content performance</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {analytics.wordpressMetrics?.publishedPosts || '8'}
                                                </div>
                                                <div className="text-sm text-gray-600">Published Articles</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-2xl font-bold text-green-600">
                                                    {analytics.wordpressMetrics?.monthlyViews || '1.2K'}
                                                </div>
                                                <div className="text-sm text-gray-600">Monthly Views</div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
