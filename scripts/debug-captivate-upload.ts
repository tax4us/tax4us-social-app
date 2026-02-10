import { CaptivateClient } from "../lib/clients/captivate-client";
import * as dotenv from "dotenv";

dotenv.config();

async function debugUpload() {
    const client = new CaptivateClient();
    const SHOW_ID = "45191a59-cf43-4867-83e7-cc2de0c5e780";
    const dummyBuffer = Buffer.alloc(1024 * 50, "PODCAST_TEST_DATA"); // 50KB

    try {
        console.log("Attempting debug upload (50KB)...");
        const result = await client.uploadMedia(SHOW_ID, dummyBuffer, "test-upload.mp3");
        console.log("✅ Upload Succeeded!", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error("❌ Upload Failed:", e);
    }
}

debugUpload();
