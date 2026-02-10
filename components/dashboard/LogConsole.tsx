"use client"

import { useEffect, useState, useRef } from "react"
import { Terminal, AlertCircle, Info, Bot } from "lucide-react"
import { cn } from "@/lib/utils"

interface LogEntry {
    id: string
    timestamp: string
    level: "info" | "warn" | "error" | "agent"
    message: string
    topicId?: string
}

export function LogConsole({ topicId, className }: { topicId?: string; className?: string }) {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [isPolling, setIsPolling] = useState(true)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        let interval: NodeJS.Timeout

        const fetchLogs = async () => {
            try {
                const url = topicId ? `/api/pipeline/logs?topicId=${topicId}` : "/api/pipeline/logs"
                const res = await fetch(url)
                const data = await res.json()
                setLogs(data.logs)
            } catch (error) {
                console.error("Failed to fetch logs", error)
            }
        }

        if (isPolling) {
            fetchLogs()
            interval = setInterval(fetchLogs, 3000)
        }

        return () => clearInterval(interval)
    }, [topicId, isPolling])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [logs])

    const getLogIcon = (level: string) => {
        switch (level) {
            case "agent": return <Bot className="h-3 w-3 text-purple-400" />
            case "error": return <AlertCircle className="h-3 w-3 text-red-500" />
            case "warn": return <AlertCircle className="h-3 w-3 text-yellow-500" />
            default: return <Info className="h-3 w-3 text-blue-400" />
        }
    }

    return (
        <div className={cn("bg-slate-950 rounded-lg border border-white/10 overflow-hidden flex flex-col font-mono text-[10px] sm:text-xs", className)}>
            <div className="bg-white/5 px-6 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/50 text-[10px] uppercase tracking-wider font-bold">
                    <Terminal className="h-3 w-3" />
                    <span>Agent Logs {topicId ? `- ${topicId}` : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={cn("h-1.5 w-1.5 rounded-full", isPolling ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                    <span className="text-[10px] text-white/30 uppercase">{isPolling ? "Live" : "Paused"}</span>
                </div>
            </div>
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[300px] scrollbar-thin scrollbar-thumb-white/10"
            >
                {logs.length === 0 ? (
                    <div className="text-white/20 italic text-center py-4">Waiting for agent activity...</div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="flex gap-2 items-start group">
                            <span className="text-white/20 shrink-0 tabular-nums">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' })}
                            </span>
                            <div className="shrink-0 mt-0.5">{getLogIcon(log.level)}</div>
                            <span className={cn(
                                "flex-1 break-words",
                                log.level === "agent" ? "text-purple-300 italic" :
                                    log.level === "error" ? "text-red-400 font-bold" :
                                        log.level === "warn" ? "text-yellow-400" :
                                            "text-white/70"
                            )}>
                                {log.message}
                            </span>
                        </div>
                    ))
                ).reverse()}
            </div>
        </div>
    )
}
