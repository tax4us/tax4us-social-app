import { KieClient } from "../lib/clients/kie-client";
import * as dotenv from "dotenv";

dotenv.config();

async function pollForOptimizedVideo() {
    const taskId = "0b3058e7c77e7ce8d41e75f79c0dc2e0";
    const kie = new KieClient();

    console.log(`Polling for Optimized Video (Task: ${taskId})...`);

    const startTime = Date.now();
    while (Date.now() - startTime < 300000) { // 5 mins
        try {
            const status = await kie.getTask(taskId);
            console.log(`Status: ${status.status} (${status.error || ""})`);

            if (status.status === "success" && status.videoUrl) {
                console.log(`\n✨ OPTIMIZED VIDEO READY: ${status.videoUrl}`);
                return;
            }

            if (status.status === "failed") {
                console.error("❌ Failed!");
                return;
            }

            await new Promise(r => setTimeout(r, 10000));
        } catch (e) {
            console.error("Poll error", e);
        }
    }
    console.log("Timeout.");
}

pollForOptimizedVideo();
