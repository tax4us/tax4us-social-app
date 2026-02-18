"use client"

import { useState, useEffect } from 'react'
import { TopicsTable, TopicRecord } from "@/components/dashboard/TopicsTable";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus } from "lucide-react";

export default function TopicsPage() {
    const [records, setRecords] = useState<TopicRecord[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchTopics()
    }, [])

    const fetchTopics = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/topics')
            const data = await response.json()
            
            if (data.success) {
                const formattedRecords: TopicRecord[] = data.topics.map((topic: any) => ({
                    id: topic.id,
                    fields: {
                        topic: topic.title_english,
                        "Title EN": topic.title_english,
                        "Title HE": topic.title_hebrew,
                        Status: topic.status || 'pending',
                        Priority: topic.priority || 'medium',
                        "Last Modified": new Date(topic.updated_at).toLocaleDateString(),
                        Tags: topic.tags?.join(', ') || '',
                        URL: topic.url || null
                    }
                }))
                setRecords(formattedRecords)
            }
        } catch (error) {
            console.error("Failed to fetch topics", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Topics & Ideas</h2>
                    <p className="text-muted-foreground">
                        Manage your bilingual tax content pipeline with {records.length} topics.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={fetchTopics}
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Topic
                    </Button>
                </div>
            </div>

            <div className="bg-card border rounded-xl p-6 shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">Loading topics...</span>
                    </div>
                ) : (
                    <TopicsTable data={records} />
                )}
            </div>
        </div>
    )
}
