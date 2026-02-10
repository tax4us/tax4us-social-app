"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, CheckCircle, Clock, AlertCircle } from "lucide-react"

interface Stats {
    totalTopics: number;
    readyTopics: number;
    publishedPosts: number;
    pendingReview: number;
    totalCategories: number;
}

export function StatsCards({ stats }: { stats: Stats }) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue (Mock)</CardTitle>
                    <span className="text-muted-foreground font-bold">$45,231.89</span>
                </CardHeader>
                <CardContent>
                    <div className="text-xs text-muted-foreground">+20.1% from last month</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Published Posts</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.publishedPosts}</div>
                    <p className="text-xs text-muted-foreground">
                        Live on WordPress
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ready to Generate</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.readyTopics}</div>
                    <p className="text-xs text-muted-foreground">
                        Topics waiting in pipeline
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.pendingReview}</div>
                    <p className="text-xs text-muted-foreground">
                        Drafts awaiting approval
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
