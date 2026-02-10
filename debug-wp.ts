
import { fetchWordPressInventory } from "./lib/wordpress-client";
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log("Fetching WP Inventory...");
    const items = await fetchWordPressInventory();
    if (!items) {
        console.log("Failed to fetch items.");
        return;
    }
    console.log(`Fetched ${items.length} items.`);
    console.log("Top 5 items:");
    items.slice(0, 5).forEach(item => {
        console.log(`[${item.id}] ${item.titleHe || item.titleEn} (${item.status}) - ${item.date}`);
    });
}

main();
