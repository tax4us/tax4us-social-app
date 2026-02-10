import { ElevenLabsClient } from "../lib/clients/elevenlabs-client";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

async function generateTestMp3() {
    const client = new ElevenLabsClient();
    try {
        console.log("Generating test MP3 from ElevenLabs...");
        const buffer = await client.generateSpeech("test"); // Uses default voice from env
        fs.writeFileSync("real-test.mp3", Buffer.from(buffer));
        console.log("✅ real-test.mp3 saved.");
    } catch (e) {
        console.error("ElevenLabs Failed:", e);
    }
}

generateTestMp3();
