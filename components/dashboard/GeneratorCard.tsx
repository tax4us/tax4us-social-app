"use client"

import { useState } from "react"
import { Play, Sparkles, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface GeneratorCardProps {
    title: string
    description: string
    icon: React.ReactNode
    endpoint: string
    inputType?: "topicId" | "none"
}

export function GeneratorCard({ title, description, icon, endpoint, inputType = "none" }: GeneratorCardProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [inputValue, setInputValue] = useState("")

    const handleRun = async () => {
        const secret = prompt("Enter CRON_SECRET/API_KEY:")
        if (!secret) return

        setIsLoading(true)
        try {
            const url = new URL(endpoint, window.location.origin)
            url.searchParams.append("cron_secret", secret)
            if (inputType === "topicId" && inputValue) {
                url.searchParams.append("topicId", inputValue)
            }

            const response = await fetch(url)
            if (!response.ok) throw new Error("Trigger failed")

            alert(`${title} triggered successfully!`)
        } catch (error) {
            console.error(error)
            alert(`Failed to trigger ${title}`)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="hover:border-primary/50 transition-colors rounded-2xl overflow-hidden shadow-sm hover:shadow-md">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary">
                        {icon}
                    </div>
                    <div>
                        <CardTitle className="text-lg">{title}</CardTitle>
                        <CardDescription className="line-clamp-1">{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                {inputType === "topicId" && (
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Input Topic ID</label>
                        <Input
                            placeholder="Optional topic identifier..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="bg-muted/50 border-none focus-visible:ring-1"
                        />
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button onClick={handleRun} disabled={isLoading} size="xl" className="w-full">
                    {isLoading ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                        <Sparkles className="mr-2 h-5 w-5" />
                    )}
                    Launch Agent
                </Button>
            </CardFooter>
        </Card>
    )
}
