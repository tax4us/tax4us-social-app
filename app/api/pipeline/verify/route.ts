import { NextResponse } from 'next/server';
import { fetchInventory, fetchPodcasts, fetchSeoMetrics } from '@/lib/pipeline-data';
import { getN8nState } from '@/lib/n8n-bridge';
import { checkSystemHealth } from '@/lib/health-check';
import { fetchRecentMedia } from '@/lib/services/intelligence';

export const dynamic = 'force-dynamic';

export async function GET() {
    // We use the same functions as the dashboard for consistency
    const [
        inventory,
        n8nState,
        health,
        podcasts,
        media,
        seo
    ] = await Promise.all([
        fetchInventory().catch(() => []),
        getN8nState().catch(() => ({})),
        checkSystemHealth().catch(() => []),
        fetchPodcasts().catch(() => []),
        fetchRecentMedia().catch(() => []),
        fetchSeoMetrics().catch(() => [])
    ]);

    return NextResponse.json({
        timestamp: new Date().toISOString(),
        inventory: {
            count: inventory ? (Array.isArray(inventory) ? inventory.length : (inventory as any).total || 0) : 0,
            status: inventory ? "connected" : "error_fallback"
        },
        podcasts: {
            count: podcasts.length,
            status: podcasts.length > 0 ? "connected" : "no_data_or_error"
        },
        media: {
            count: media.length,
            status: media.length > 0 ? "connected" : "no_data_or_error"
        },
        seo: {
            count: seo.length,
            status: seo.length > 0 ? "connected" : "no_data_or_error"
        },
        health: {
            statuses: health.map((s: any) => ({ name: s.name, status: s.status, latency: s.latency }))
        }
    });
}
