import { fetchPipelineStatus, fetchInventory } from "@/lib/pipeline-data"
import { fetchPodcastEpisodes } from "@/lib/services/podcast"
import { fetchCostSummary } from "@/lib/services/api-costs"
import { insightsService } from "@/lib/services/insights"
import UniversalDashboard from "@/components/UniversalDashboard"

export const dynamic = 'force-dynamic'

/** Wraps a fetch with a timeout — returns fallback if it takes too long */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ])
}

export default async function DashboardPage() {
  // All fetches in parallel — non-critical ones get aggressive timeouts + fallbacks
  const [
    inventory,
    podcasts,
    pipelineStatus,
    costs,
  ] = await Promise.all([
    withTimeout(fetchInventory(), 4000, { items: [], total: 0 }),
    // Skip podcast API in development to prevent auth spam
    process.env.NODE_ENV === 'development' ? Promise.resolve([]) : withTimeout(fetchPodcastEpisodes(), 3000, []),
    withTimeout(fetchPipelineStatus(), 4000, []),
    withTimeout(fetchCostSummary(), 3000, undefined),
  ])

  // Insights now include real Facebook data — reuses inventory total for WP/LinkedIn derived metrics
  const insights = await insightsService.fetchUnifiedInsights(inventory.total)

  return (
    <UniversalDashboard
      inventory={inventory}
      podcasts={podcasts}
      initialRecords={pipelineStatus}
      costSummary={costs}
      insights={insights}
    />
  )
}
