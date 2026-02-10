import { SystemService } from "./pipeline-data";

export async function checkSystemHealth(): Promise<SystemService[]> {
    const serviceTargets = [
        { id: "wp", name: "WordPress API", url: "https://tax4us.co.il/wp-json/wp/v2/posts?per_page=1" },
        { id: "slack", name: "Slack Notifications", url: "https://status.slack.com/" },
        { id: "anthropic", name: "Claude AI", url: "https://status.anthropic.com/" },
        { id: "kie", name: "Kie.ai Generation", url: "https://kie.ai" },
        { id: "eleven", name: "ElevenLabs TTS", url: "https://status.elevenlabs.io/" },
    ];

    const services: SystemService[] = await Promise.all(serviceTargets.map(async (target) => {
        const start = Date.now();
        let status: SystemService['status'] = "outage";
        let latency = 0;

        try {
            // Use NO-CACHE to get real latency
            const response = await fetch(target.url, {
                method: "HEAD",
                cache: "no-store",
                signal: AbortSignal.timeout(5000)
            });
            latency = Date.now() - start;

            // If we got a response, it's generally "up" unless it's a server error
            if (response.status >= 500) {
                status = "outage";
            } else {
                status = latency > 1500 ? "degraded" : "operational";
            }
        } catch (e) {
            console.error(`Ping failed for ${target.name}:`, e);
            status = "outage";
        }

        // Mock uptime for now as we don't have historical data to calculate it
        // We could persist this in n8n-bridge if we wanted history
        const uptime = 99.9;

        return {
            id: target.id,
            name: target.name,
            status,
            latency,
            uptime
        };
    }));

    return services;
}
