import { KieClient } from "../clients/kie-client";
import { WordPressClient } from "../clients/wordpress-client";
import { pipelineLogger } from "./logger";
import { ArticleContent } from "../types/pipeline";

export interface MediaGenerationRequest {
    hebrew_title: string;
    english_title: string;
    hebrew_content: string;
    english_content: string;
    focus_keyword: string;
    style?: "abstract" | "documentary" | "corporate";
    generate_video?: boolean;
    generate_images?: boolean;
}

export interface MediaGenerationResult {
    success: boolean;
    hebrew_image_id?: number;
    english_image_id?: number;
    hebrew_video_url?: string;
    english_video_url?: string;
    hebrew_image_url?: string;
    english_image_url?: string;
    errors: string[];
    task_ids: string[];
}

export class MediaProcessor {
    private kie: KieClient;
    private wp: WordPressClient;

    constructor() {
        this.kie = new KieClient();
        this.wp = new WordPressClient();
    }

    /**
     * Complete media generation workflow from n8n patterns
     * Generates both images and videos for Hebrew and English content
     */
    async generatePostMedia(request: MediaGenerationRequest): Promise<MediaGenerationResult> {
        const {
            hebrew_title,
            english_title,
            hebrew_content,
            english_content,
            focus_keyword,
            style = "documentary",
            generate_video = false,
            generate_images = true
        } = request;

        const result: MediaGenerationResult = {
            success: false,
            errors: [],
            task_ids: []
        };

        pipelineLogger.info('Media Generation Pipeline Started', 'MEDIA', { hebrew_title, english_title });

        try {
            // 1. Generate Hebrew featured image
            if (generate_images) {
                pipelineLogger.agent(`Generating Hebrew featured image`, 'MEDIA');
                const hebrewImagePrompt = this.createImagePrompt(hebrew_title, focus_keyword, 'he');
                const hebrewImageData = await this.generateAndUploadImage(hebrewImagePrompt, hebrew_title);
                result.hebrew_image_id = hebrewImageData.id;
                result.hebrew_image_url = hebrewImageData.url;
            }

            // 2. Generate English featured image 
            if (generate_images) {
                pipelineLogger.agent(`Generating English featured image`, 'MEDIA');
                const englishImagePrompt = this.createImagePrompt(english_title, focus_keyword, 'en');
                const englishImageData = await this.generateAndUploadImage(englishImagePrompt, english_title);
                result.english_image_id = englishImageData.id;
                result.english_image_url = englishImageData.url;
            }

            // 3. Generate Hebrew video background (optional)
            if (generate_video) {
                pipelineLogger.agent(`Generating Hebrew video background`, 'MEDIA');
                try {
                    const hebrewVideoTaskId = await this.kie.generateVideo({
                        title: hebrew_title,
                        excerpt: this.extractExcerpt(hebrew_content),
                        style
                    });
                    result.task_ids.push(hebrewVideoTaskId);
                    // Note: Video URLs are obtained later via polling or webhooks
                } catch (videoError: any) {
                    result.errors.push(`Hebrew video generation failed: ${videoError.message}`);
                }
            }

            // 4. Generate English video background (optional)
            if (generate_video) {
                pipelineLogger.agent(`Generating English video background`, 'MEDIA');
                try {
                    const englishVideoTaskId = await this.kie.generateVideo({
                        title: english_title,
                        excerpt: this.extractExcerpt(english_content),
                        style
                    });
                    result.task_ids.push(englishVideoTaskId);
                } catch (videoError: any) {
                    result.errors.push(`English video generation failed: ${videoError.message}`);
                }
            }

            result.success = (result.hebrew_image_id || result.english_image_id) ? true : false;
            pipelineLogger.success('Media generation completed', 'MEDIA', {
                hebrew_image: !!result.hebrew_image_id,
                english_image: !!result.english_image_id,
                video_tasks: result.task_ids.length
            });

        } catch (error: any) {
            result.errors.push(`Media generation failed: ${error.message}`);
            pipelineLogger.error(`Media generation failed: ${error.message}`, 'MEDIA');
        }

        return result;
    }

    /**
     * Generate and upload single image with error handling
     */
    async generateAndUploadImage(prompt: string, title: string): Promise<{ url: string; id: number }> {
        pipelineLogger.agent(`Generating image: ${prompt.substring(0, 50)}...`, 'KIE');

        // 1. Generate image task
        const taskId = await this.kie.generateImage(prompt);

        // 2. Poll for completion with proper timeout
        let imageUrl = "";
        const maxAttempts = 15;
        const pollInterval = 10000;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            await new Promise((r) => setTimeout(r, pollInterval));
            const response = await this.kie.getTask(taskId);
            const status = response.status;

            pipelineLogger.info(`Image generation attempt ${attempt}/${maxAttempts}: ${status}`, 'KIE');

            if (status === "success" && response.url) {
                imageUrl = response.url;
                break;
            }
            if (status === "failed") {
                throw new Error(`Kie.ai image generation failed: ${response.error}`);
            }
        }

        if (!imageUrl) {
            throw new Error("Image generation timed out after 150 seconds");
        }

        // 3. Download and upload to WordPress
        return await this.downloadAndUploadToWordPress(imageUrl, title);
    }

    /**
     * Download image from Kie.ai and upload to WordPress
     */
    private async downloadAndUploadToWordPress(imageUrl: string, title: string): Promise<{ url: string; id: number }> {
        try {
            // Download image from Kie.ai
            const imageRes = await fetch(imageUrl);
            if (!imageRes.ok) {
                throw new Error(`Failed to download image: ${imageRes.status} ${imageRes.statusText}`);
            }

            const arrayBuffer = await imageRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const mimeType = imageRes.headers.get("content-type") || "image/png";
            const filename = `${title.replace(/[^a-z0-9\u0590-\u05FF]/gi, "-").toLowerCase()}.png`;

            // Upload to WordPress
            const media = await this.wp.uploadMedia(buffer, filename, mimeType);
            
            pipelineLogger.success(`Image uploaded to WordPress: ${media.source_url}`, 'WP');
            return { url: media.source_url, id: media.id };

        } catch (error: any) {
            throw new Error(`WordPress upload failed: ${error.message}`);
        }
    }

    /**
     * Create optimized image prompt for Tax4US content
     */
    private createImagePrompt(title: string, focusKeyword: string, language: 'he' | 'en'): string {
        const isHebrew = language === 'he';
        
        // Base professional tax/finance theme
        let basePrompt = `Professional tax and financial services featured image for: "${title}". `;
        
        if (isHebrew) {
            basePrompt += `Hebrew context. Theme: US-Israel cross-border taxation. `;
        } else {
            basePrompt += `English context. Theme: US-Israel tax compliance and planning. `;
        }

        basePrompt += `Visual elements: Clean modern design, professional color palette (green #8fb634, white, gray accents). `;
        basePrompt += `Include subtle US and Israeli flag elements. `;
        basePrompt += `Focus concept: ${focusKeyword}. `;
        basePrompt += `Style: Professional, trustworthy, modern business aesthetic. `;
        basePrompt += `Format: 16:9 horizontal banner suitable for blog featured image. `;
        basePrompt += `No text overlay, no people, abstract/symbolic representation. `;
        basePrompt += `High quality, premium look, suitable for tax advisory website.`;

        return basePrompt;
    }

    /**
     * Extract content excerpt for video generation
     */
    private extractExcerpt(content: string, maxLength: number = 200): string {
        const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        return textContent.length > maxLength 
            ? textContent.substring(0, maxLength) + '...'
            : textContent;
    }

    /**
     * Poll for video completion and get final URLs
     */
    async pollVideoCompletion(taskIds: string[], timeoutMs: number = 600000): Promise<{
        completed: { taskId: string; url: string }[];
        failed: { taskId: string; error: string }[];
        pending: string[];
    }> {
        const completed: { taskId: string; url: string }[] = [];
        const failed: { taskId: string; error: string }[] = [];
        const pending: string[] = [];

        for (const taskId of taskIds) {
            try {
                const status = await this.kie.getTask(taskId);
                
                if (status.status === 'success' && status.videoUrl) {
                    completed.push({ taskId, url: status.videoUrl });
                } else if (status.status === 'failed') {
                    failed.push({ taskId, error: status.error || 'Unknown error' });
                } else {
                    pending.push(taskId);
                }
            } catch (error: any) {
                failed.push({ taskId, error: error.message });
            }
        }

        return { completed, failed, pending };
    }

    /**
     * Generate single video with simple interface
     */
    async generateVideo(prompt: string): Promise<string> {
        const taskId = await this.kie.generateVideo({ title: prompt, excerpt: prompt });
        return taskId;
    }

    /**
     * Batch process multiple media generations
     */
    async batchGenerateMedia(requests: MediaGenerationRequest[]): Promise<MediaGenerationResult[]> {
        const results: MediaGenerationResult[] = [];
        
        for (const request of requests) {
            try {
                const result = await this.generatePostMedia(request);
                results.push(result);
                
                // Brief pause between generations to avoid overwhelming Kie.ai
                if (requests.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            } catch (error: any) {
                results.push({
                    success: false,
                    errors: [error.message],
                    task_ids: []
                });
            }
        }

        return results;
    }
}
