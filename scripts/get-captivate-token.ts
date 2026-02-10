import { CaptivateClient } from "../lib/clients/captivate-client";
import * as dotenv from "dotenv";

dotenv.config();

async function printToken() {
    const client = new CaptivateClient();
    try {
        // @ts-ignore - accessing private for debug
        const token = await client.authenticate();
        console.log("CAPTIVATE_TOKEN:", token);
    } catch (e) {
        console.error("Auth failed:", e);
    }
}

printToken();
