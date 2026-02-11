import { fetchInventory, fetchPodcasts, fetchPipelineStatus } from "@/lib/pipeline-data";
import { fetchCostSummary } from "@/lib/services/api-costs";
import { Dashboard } from "@/components/UniversalDashboard";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Parallel fetch for live "Proof of Work"
  const [inventory, podcasts, pipeline, costData] = await Promise.all([
    fetchInventory(),
    fetchPodcasts(),
    fetchPipelineStatus(),
    fetchCostSummary().catch(() => undefined),
  ]);

  return (
    <div className="md:p-2 p-1">
      <Dashboard
        initialRecords={pipeline}
        podcastEpisodes={podcasts}
        wordpressInventory={inventory}
        costData={costData}
      />
    </div>
  );
}
