
import dotenv from "dotenv";
dotenv.config();

import { AirtableClient } from "./lib/clients/airtable-client";
import { WordPressClient } from "./lib/clients/wordpress-client";
import { ClaudeClient } from "./lib/clients/claude-client";
import { TavilyClient } from "./lib/clients/tavily-client";
import { KieClient } from "./lib/clients/kie-client";

async function handshake() {
    console.log("🤝 Starting B.L.A.S.T. Link Phase Handshake...");
    console.log("Debug Env Vars:");
    console.log("TAVILY_API_KEY:", process.env.TAVILY_API_KEY ? "Present" : "Missing");
    console.log("KIE_AI_API_KEY:", process.env.KIE_AI_API_KEY ? "Present" : "Missing");
    console.log("AIRTABLE_TOKEN:", process.env.AIRTABLE_TOKEN ? "Present" : "Missing");
    console.log("AIRTABLE_API_KEY:", process.env.AIRTABLE_API_KEY ? "Present" : "Missing");
    console.log("WP_USERNAME:", process.env.WP_USERNAME);

    // 1. Airtable
    try {
        const at = new AirtableClient();
        // Try to fetch 1 record from Content table
        await at.getRecords("tblq7MDqeogrsdInc", { maxRecords: 1 });
        console.log("✅ Airtable: Connected");
    } catch (e: any) {
        console.error("❌ Airtable: Failed", e.message);
    }

    // 2. WordPress
    try {
        const wp = new WordPressClient();
        // Try to fetch categories (read-only safe op)
        await wp.getCategories();
        console.log("✅ WordPress: Connected");
    } catch (e: any) {
        console.error("❌ WordPress: Failed", e.message);
    }

    // 3. Claude
    try {
        const claude = new ClaudeClient();
        await claude.generate("Hello world", "claude-3-5-haiku-20241022");
        console.log("✅ Claude: Connected");
    } catch (e: any) {
        console.error("❌ Claude: Failed", e.message);
    }

    // 4. Tavily
    try {
        const tavily = new TavilyClient();
        await tavily.search("tax news");
        console.log("✅ Tavily: Connected");
    } catch (e: any) {
        console.error("❌ Tavily: Failed", e.message);
    }

    // 5. Kie.ai
    try {
        const kie = new KieClient();
        // Kie doesn't have a simple 'ping', we'll skip active generation to save credits
        // Just checking if init worked (API key presence)
        if (process.env.KIE_AI_API_KEY) console.log("✅ Kie.ai: API Key Present (Skipping active generation)");
        else console.error("❌ Kie.ai: Missing API Key");
    } catch (e: any) {
        console.error("❌ Kie.ai: Failed", e.message);
    }
}

handshake();
