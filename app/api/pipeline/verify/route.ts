import { NextResponse } from 'next/server';
import { fetchWordPressInventory } from '@/lib/wordpress-client';
import { getN8nState } from '@/lib/n8n-bridge';
import { checkSystemHealth } from '@/lib/health-check';
import { fetchPodcastEpisodes } from '@/lib/services/podcast';
import { fetchMediaGenerations, fetchSeoMetrics } from '@/lib/services/intelligence';

export const dynamic = 'force-dynamic';

export async function GET() {
    const [
        inventory,
        n8nState,
        health,
        podcasts,
        media,
        seo
    ] = await Promise.all([
        fetchWordPressInventory(),
        getN8nState(),
        checkSystemHealth(),
        fetchPodcastEpisodes(),
        fetchMediaGenerations(),
        fetchSeoMetrics()
    ]);

    return NextResponse.json({
        timestamp: new Date().toISOString(),
        inventory: {
            count: inventory ? inventory.length : 0,
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
            statuses: health.map(s => ({ name: s.name, status: s.status, latency: s.latency }))
        }
    });
}
