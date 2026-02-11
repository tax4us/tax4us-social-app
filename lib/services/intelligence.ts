import { SeoMetric, MediaGeneration } from "@/lib/pipeline-data";
import { WordPressClient } from "@/lib/clients/wordpress-client";

/**
 * Real SEO metrics via SerpApi — checks Google rankings for Tax4Us target keywords.
 * Falls back to empty array if SERPAPI_KEY is missing.
 */
export async function fetchSeoMetrics(): Promise<SeoMetric[]> {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) return [];

    // Target keywords that matter for Tax4Us business
    const keywords = [
        { query: "FBAR filing requirements", page: "FBAR Guide" },
        { query: "US Israel tax treaty", page: "Tax Treaty Overview" },
        { query: "American taxes in Israel", page: "Expat Tax Guide" },
        { query: "foreign bank account reporting", page: "FBAR Compliance" },
    ];

    const results: SeoMetric[] = [];

    try {
        // Fetch in parallel with individual timeouts
        const searches = await Promise.allSettled(
            keywords.map(async (kw, idx) => {
                const url = `https://serpapi.com/search.json`
                    + `?q=${encodeURIComponent(kw.query)}`
                    + `&location=United+States`
                    + `&gl=us&hl=en`
                    + `&api_key=${apiKey}`;

                const res = await fetch(url, {
                    signal: AbortSignal.timeout(4000),
                    cache: "no-store"
                });

                if (!res.ok) throw new Error(`SerpApi ${res.status}`);
                return { kw, data: await res.json(), idx };
            })
        );

        for (const result of searches) {
            if (result.status !== "fulfilled") continue;
            const { kw, data, idx } = result.value;

            const organicResults = data.organic_results || [];
            // Check if tax4us.co.il appears in top results
            const ourResult = organicResults.find((r: any) =>
                r.link?.includes("tax4us.co.il")
            );

            const position = ourResult?.position || 0;
            // Convert position to a 0-100 score: position 1 = 100, position 10 = 55, >50 = 10
            const score = position > 0
                ? Math.max(10, Math.round(100 - (position - 1) * 5))
                : 0; // 0 = not found in results

            const searchResults = data.search_information;
            const totalResults = searchResults?.total_results || 0;

            results.push({
                id: `seo-live-${idx}`,
                title: kw.page,
                score,
                keywordDensity: position > 0 ? position : 0, // Repurpose: actual rank position
                wordCount: totalResults, // Repurpose: total competing results
                status: score >= 80 ? "good" : score >= 50 ? "ok" : "bad",
                trend: position > 0 && position <= 10 ? "up" : position > 0 ? "flat" : "down"
            });
        }
    } catch (e) {
        console.error("SerpApi Error:", e);
    }

    return results;
}

/**
 * Real media items from WordPress featured images of published posts.
 * No more fake "generating" entries.
 */
export async function fetchRecentMedia(): Promise<MediaGeneration[]> {
    try {
        const wpUrl = process.env.NEXT_PUBLIC_WP_API_URL;
        if (!wpUrl) return [];

        const res = await fetch(
            `${wpUrl}/media?per_page=6&_fields=id,source_url,title,date,media_details&orderby=date&order=desc`,
            {
                signal: AbortSignal.timeout(3000),
                cache: "no-store"
            }
        );

        if (!res.ok) return [];
        const media = await res.json();

        return media.map((item: any, idx: number) => ({
            id: `wp-media-${item.id}`,
            type: "nano-featured" as const,
            status: "completed" as const,
            prompt: item.title?.rendered || `Media ${idx + 1}`,
            startTime: new Date(item.date).toLocaleDateString(),
            model: "wordpress",
            cost: 0,
            previewUrl: item.media_details?.sizes?.medium?.source_url || item.source_url
        }));
    } catch (e) {
        console.error("WordPress media fetch error:", e);
        return [];
    }
}
