import { Bot, Share2, Mic, Zap } from "lucide-react"
import { GeneratorCard } from "@/components/dashboard/GeneratorCard"
import { LogConsole } from "@/components/dashboard/LogConsole"

export default function GeneratorsPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Content Generators</h2>
                    <p className="text-muted-foreground">
                        Manually trigger AI agents to generate, repurpose, or produce content.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <GeneratorCard
                    title="Pipeline Orchestrator"
                    description="Runs the full B.L.A.S.T. pipeline for ready topics."
                    icon={<Bot className="h-6 w-6" />}
                    endpoint="/api/pipeline/cron"
                />
                <GeneratorCard
                    title="Single Topic Runner"
                    description="Force runs the pipeline for a specific Airtable Record ID."
                    icon={<Zap className="h-6 w-6" />}
                    endpoint="/api/pipeline/run"
                    inputType="topicId"
                />
                <GeneratorCard
                    title="Social Repurposer"
                    description="AI generation for LinkedIn and Facebook (WP content required)."
                    icon={<Share2 className="h-6 w-6" />}
                    endpoint="/api/pipeline/run?type=social"
                    inputType="topicId"
                />
                <GeneratorCard
                    title="Podcast Producer"
                    description="Scripting and audio synthesis via ElevenLabs."
                    icon={<Mic className="h-6 w-6" />}
                    endpoint="/api/pipeline/run?type=podcast"
                    inputType="topicId"
                />
                <GeneratorCard
                    title="Data Auto-Healer"
                    description="Scans Airtable for incomplete records and enriches them."
                    icon={<Zap className="h-6 w-6 text-yellow-400" />}
                    endpoint="/api/pipeline/heal"
                />
            </div>

            <div className="mt-8">
                <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    Agent Thought Stream
                </h3>
                <LogConsole className="h-[400px]" />
            </div>
        </div>
    )
}
