import { AirtableClient } from "./lib/clients/airtable-client";
import dotenv from "dotenv";
dotenv.config();

async function main() {
    const client = new AirtableClient();
    const records = await client.getRecords("tblq7MDqeogrsdInc", { maxRecords: 3 });
    console.log(JSON.stringify(records, null, 2));
}

main();
