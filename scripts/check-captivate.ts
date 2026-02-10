import { CaptivateClient } from "../lib/clients/captivate-client";
import * as dotenv from "dotenv";

dotenv.config();

async function checkCaptivate() {
    const client = new CaptivateClient();
    try {
        console.log("Checking Captivate shows...");
        const shows = await client.getShows();
        console.log("Shows:", JSON.stringify(shows, null, 2));

        if (shows && shows.shows && shows.shows.length > 0) {
            const showId = shows.shows[0].id;
            console.log(`Checking episodes for show ${showId}...`);
            const episodes = await client.getEpisodes(showId);
            console.log("Episodes count:", episodes.length);
        }
    } catch (e) {
        console.error("Captivate Check Failed:", e);
    }
}

checkCaptivate();
