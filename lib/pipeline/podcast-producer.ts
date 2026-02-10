import { ElevenLabsClient } from "../clients/elevenlabs-client";
import { CaptivateClient } from "../clients/captivate-client";
import { ClaudeClient } from "../clients/claude-client";
import { WordPressClient } from "../clients/wordpress-client";
import { SlackClient } from "../clients/slack-client";
import { pipelineLogger } from "./logger";

const EMMA_VOICE_ID = "3dzJXoCYueSQiptQ6euE";
const BEN_VOICE_ID = "9FevED7AoujYF2nBsEvC";
const SHOW_ID = "45191a59-cf43-4867-83e7-cc2de0c5e780";

export class PodcastProducer {
    private elevenLabs: ElevenLabsClient;
    private captivate: CaptivateClient;
    private claude: ClaudeClient;
    private wp: WordPressClient;
    private slack: SlackClient;

    constructor() {
        this.elevenLabs = new ElevenLabsClient();
        this.captivate = new CaptivateClient();
        this.claude = new ClaudeClient();
        this.wp = new WordPressClient();
        this.slack = new SlackClient();
    }

    /**
     * Phase 1: Generates content, synthesizes audio, uploads to Captivate,
     * AND creates a "Draft" episode.
     * Does NOT publish. Sends a Slack notification for approval.
     */
    async prepareEpisode(articleHtml: string, title: string, wpPostId?: number) {
        pipelineLogger.info(`Starting podcast preparation for: "${title}"`, "PODCAST");

        try {
            // 1. Calculate Episode Number
            const nextEpisodeNum = await this.getNextEpisodeNumber();
            pipelineLogger.info(`Next Episode Number: ${nextEpisodeNum}`, "PODCAST");

            // 2. Generate Script
            const script = await this.generateScript(articleHtml, title, nextEpisodeNum);

            // 3. Synthesize Audio
            const audioBuffer = await this.synthesizeAudio(script);

            // 4. Upload Media to Captivate
            const media = await this.uploadMedia(audioBuffer, title, nextEpisodeNum);
            pipelineLogger.success(`Media uploaded. ID: ${media.id}`, "PODCAST");

            // 5. Create DRAFT Episode on Captivate (Holds the script/notes)
            pipelineLogger.agent("Creating DRAFT episode on Captivate...", "PODCAST");
            const episode = await this.captivate.createEpisode({
                showId: SHOW_ID,
                title,
                mediaId: media.id,
                date: new Date().toISOString().replace("T", " ").split(".")[0],
                status: "Draft", // <--- Key change: Draft
                notes: script.substring(0, 4000), // Captivate limit
                season: 1,
                episodeNumber: nextEpisodeNum
            });
            const episodeId = episode.id || episode.episode?.id;
            pipelineLogger.success(`Draft Episode created. ID: ${episodeId}`, "PODCAST");

            // 6. Notify Slack for Approval
            // Pass the episodeId so the button can reference it
            await this.slack.sendAudioReady(title, nextEpisodeNum, media.media_url);
            await this.slack.sendApprovalRequest(title, nextEpisodeNum, episodeId);

            return {
                status: "waiting_for_approval",
                episodeNumber: nextEpisodeNum,
                mediaId: media.id,
                episodeId: episodeId,
                mediaUrl: media.media_url,
                wpPostId,
                title
            };

        } catch (error: any) {
            pipelineLogger.error(`Podcast preparation failed for "${title}"`, error);
            await this.slack.sendErrorNotification(`Preparing episode "${title}"`, error);
            throw error;
        }
    }

    /**
     * Phase 2: Publishes the episode and updates WordPress.
     * Triggered via Slack Button or API.
     * Input only needs to identify the episode.
     */
    async publishEpisode(params: {
        episodeId: string,
        title: string,
        episodeNumber: number,
        wpPostId?: number
    }) {
        pipelineLogger.info(`Publishing Episode #${params.episodeNumber} (ID: ${params.episodeId})`, "PODCAST");

        try {
            // 1. Update Episode Status to Published
            await this.captivate.updateEpisode(params.episodeId, {
                showId: SHOW_ID, // Required by some endpoints, implies context
                status: "Published",
                date: new Date().toISOString().replace("T", " ").split(".")[0]
            });

            pipelineLogger.success(`Episode ${params.episodeId} status updated to Published.`, "PODCAST");

            // 2. Update WordPress (if we have ID)
            // Note: Since we don't persist wpPostId in Captivate, it must be passed in or we skip
            if (params.wpPostId) {
                await this.updateWordPress(params.wpPostId, {
                    episodeNumber: params.episodeNumber,
                    mediaId: "", // Not needed for update unless we want to overwrite
                    episodeId: params.episodeId
                });
            }

            // 3. Notify Slack
            // We construct the player URL
            const playerUrl = `https://player.captivate.fm/${params.episodeId}`;
            await this.slack.sendPublishConfirmation(params.title, params.episodeNumber, playerUrl);

            return { success: true, episodeId: params.episodeId };

        } catch (error: any) {
            pipelineLogger.error(`Publishing failed for "${params.title}"`, error);
            await this.slack.sendErrorNotification(`Publishing episode "${params.title}"`, error);
            throw error;
        }
    }

    // --- Helper Methods ---

    private async getNextEpisodeNumber(): Promise<number> {
        const episodes = await this.captivate.getEpisodes(SHOW_ID);
        let maxEp = 0;
        episodes.forEach((ep: any) => {
            const num = Number(ep.episode_number) || 0;
            if (num > maxEp) maxEp = num;
        });
        return maxEp + 1;
    }

    private async generateScript(articleHtml: string, title: string, episodeNumber: number): Promise<string> {
        // Outline
        const plainText = articleHtml.replace(/<[^>]+>/g, " ").substring(0, 15000);
        const outlinePrompt = `You are a podcast content creator for Tax4US. Create a detailed 10-15 MINUTE podcast outline for Episode ${episodeNumber}: ${title}\n\nARTICLE CONTENT:\n${plainText}\n\nFormat: Emma (host) interviews Ben Ginati (tax expert). Include intro, 3-5 segments, and closing.`;

        pipelineLogger.agent("Generating detailed outline...", "PODCAST");
        const outline = await this.claude.generate(outlinePrompt, "claude-3-haiku-20240307");

        // Full Script
        const scriptPrompt = `Write a complete, high-engagement 10-15 minute podcast script for Tax4US.
OUTLINE:
${outline}

CHARACTER ANCHORS:
Emma (Host): Jewish-American expat living in Israel. Warm, curious, slightly humorous. She represents the audience's confusion and asks the "dumb" questions we all have.
Ben (Tax Expert): The authoritative voice of Tax4US. Knowledgeable but accessible. He uses vivid analogies (e.g., comparing tax brackets to climbing a mountain). He is Ben Ginati.

FORMAT RULES:
- Emma: [text]
- Ben: [text]
- Dialogue must feel natural, with Emma occasionally interrupting to clarify.
- No stage directions or sound effects in text.
- Target 10,000+ characters (long-form).
- Language: English (Premium US accent tone).`;

        pipelineLogger.agent("Generating professional dialogue script with character anchors...", "PODCAST");
        return await this.claude.generate(scriptPrompt, "claude-3-haiku-20240307");
    }

    private async synthesizeAudio(script: string): Promise<Buffer> {
        const segments = this.parseScript(script);
        pipelineLogger.info(`Parsed script into ${segments.length} dialogue segments.`, "PODCAST");

        const audioBuffers: Buffer[] = [];
        const MAX_CHARS_PER_BATCH = 4000;
        let currentBatch: { text: string; voice_id: string }[] = [];
        let currentBatchSize = 0;

        for (const segment of segments) {
            if (currentBatchSize + segment.text.length > MAX_CHARS_PER_BATCH && currentBatch.length > 0) {
                pipelineLogger.agent(`Generating audio for batch of ${currentBatch.length} segments...`, "PODCAST");
                const buffer = await this.elevenLabs.generateDialogue(currentBatch);
                audioBuffers.push(Buffer.from(buffer));
                currentBatch = [segment];
                currentBatchSize = segment.text.length;
            } else {
                currentBatch.push(segment);
                currentBatchSize += segment.text.length;
            }
        }
        if (currentBatch.length > 0) {
            const buffer = await this.elevenLabs.generateDialogue(currentBatch);
            audioBuffers.push(Buffer.from(buffer));
        }

        const finalBuffer = Buffer.concat(audioBuffers);
        pipelineLogger.success(`Audio generation complete. Size: ${(finalBuffer.length / 1024 / 1024).toFixed(2)} MB`, "PODCAST");
        return finalBuffer;
    }

    private async uploadMedia(buffer: Buffer, title: string, episodeNumber: number) {
        pipelineLogger.agent("Uploading media to Captivate.fm...", "PODCAST");
        const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
        const filename = `tax4us-ep${episodeNumber}-${sanitizedTitle}.mp3`.substring(0, 100);

        const media = await this.captivate.uploadMedia(SHOW_ID, buffer, filename);
        const mediaData = media.media || media;

        return {
            id: mediaData.id,
            media_url: mediaData.media_url
        };
    }

    private async updateWordPress(postId: number, data: { episodeNumber: number, mediaId: string, episodeId: string }) {
        pipelineLogger.agent(`Updating WordPress post ${postId} with podcast metadata...`, "PODCAST");
        await this.wp.updatePost(postId, {
            meta: {
                podcast_status: "published",
                podcast_episode_number: data.episodeNumber,
                podcast_media_id: data.mediaId, // Might be empty if not passed
                podcast_show_id: SHOW_ID,
                podcast_season: 1,
                captivate_episode_id: data.episodeId
            }
        } as any);
    }

    private parseScript(script: string): { text: string; voice_id: string }[] {
        const segments: { text: string; voice_id: string }[] = [];
        const lines = script.split("\n");
        let currentSpeaker: "EMMA" | "BEN" | null = null;
        let currentText = "";

        const pushSegment = () => {
            if (currentSpeaker && currentText.trim()) {
                segments.push({
                    text: currentText.trim().replace(/\*\*/g, "").replace(/\s+/g, " "),
                    voice_id: currentSpeaker === "EMMA" ? EMMA_VOICE_ID : BEN_VOICE_ID
                });
            }
        };

        for (const line of lines) {
            const t = line.trim();
            if (!t) continue;

            const emmaMatch = t.match(/^(?:\*\*)?Emma\s*:(?:\*\*)?\s*(.*)/i);
            const benMatch = t.match(/^(?:\*\*)?Ben\s*:(?:\*\*)?\s*(.*)/i);

            if (emmaMatch) {
                pushSegment();
                currentSpeaker = "EMMA";
                currentText = emmaMatch[1];
            } else if (benMatch) {
                pushSegment();
                currentSpeaker = "BEN";
                currentText = benMatch[1];
            } else if (currentSpeaker) {
                currentText += " " + t;
            }
        }
        pushSegment();

        return segments.filter(s => s.text.length > 5);
    }
}
