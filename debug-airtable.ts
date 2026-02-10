
import { AirtableClient } from "./lib/clients/airtable-client";

async function debug() {
    const airtable = new AirtableClient();
    console.log("Fetching records...");
    try {
        const records = await airtable.getRecords("tblq7MDqeogrsdInc", { maxRecords: 5 });
        console.log("First record fields:", JSON.stringify(records[0]?.fields, null, 2));
        console.log("All record IDs:", records.map((r: any) => r.id));
    } catch (e) {
        console.error(e);
    }
}

debug();
