import { fetchInventory, fetchPodcasts, fetchPipelineStatus } from "@/lib/pipeline-data";
import { Dashboard } from "@/components/Dashboard";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Parallel fetch for live "Proof of Work"
  const [inventory, podcasts, pipeline] = await Promise.all([
    fetchInventory(),
    fetchPodcasts(),
    fetchPipelineStatus()
  ]);

  // Convert Pipeline Items back to AirtableRecord format for the Dashboard component fallback
  // OR update Dashboard to take PipelineItem[]. Let's stick to props it knows.
  // Convert Pipeline Items back to AirtableRecord format for the Dashboard component fallback
  const records = pipeline.map(item => ({
    id: item.id,
    fields: {
      topic: item.topic,
      Status: item.status === 'pending' ? 'Ready' : item.status === 'failed' ? 'Error' : 'Review' as any,
      "Last Modified": item.lastUpdated
    }
  }));

  return (
    <div className="md:p-2 p-1">
      <Dashboard
        initialRecords={records}
        podcastEpisodes={podcasts}
        wordpressInventory={inventory}
      />
    </div>
  );
}
