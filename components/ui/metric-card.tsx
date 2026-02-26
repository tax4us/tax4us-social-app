import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  trend?: "up" | "down" | "neutral"
  icon: LucideIcon
  className?: string
  description?: string
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  trend = "neutral", 
  icon: Icon, 
  className, 
  description 
}: MetricCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case "up": return "text-green-600"
      case "down": return "text-red-600"
      default: return "text-muted-foreground"
    }
  }

  return (
    <Card className={cn("rounded-xl shadow-sm border border-border/50", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold">{value}</p>
              {change !== undefined && (
                <span className={cn("text-sm font-medium", getTrendColor())}>
                  {change > 0 ? "+" : ""}{change}%
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <Icon className="h-8 w-8 text-primary" />
        </div>
      </CardContent>
    </Card>
  )
}