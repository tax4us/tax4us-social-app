import { ClaudeClient } from "../clients/claude-client";

export class SocialPublisher {
    private uploadToken: string;
    private fbPageId: string;
    private claude: ClaudeClient;

    constructor() {
        this.uploadToken = process.env.UPLOAD_POST_TOKEN || "";
        this.fbPageId = process.env.FACEBOOK_PAGE_ID || "";
        this.claude = new ClaudeClient();
    }

    async generateSocialContent(articleHtml: string, title: string) {
        console.log(`Generating social media content for: ${title}`);

        // Clean HTML to plain text for the AI prompt
        const plainText = articleHtml.replace(/<[^>]+>/g, " ").substring(0, 5000);

        // LinkedIn Prompt
        const linkedinPrompt = `
      You are a professional social media manager for "Tax4Us".
      Create a LinkedIn post based on the following article.
      
      Requirements:
      - Tone: Professional, insightful, authoritative yet accessible.
      - Structure: Hook -> Key takeaways (bullet points) -> Call to action (link in bio/comments).
      - Length: 150-250 words.
      - Hashtags: 3-5 relevant hashtags (e.g., #IsraeliTax #SmallBusiness #Finance).
      - Content:
      ${plainText}
    `;

        // Facebook Prompt
        const facebookPrompt = `
      You are a social media manager for "Tax4Us".
      Create a Facebook post based on the following article.

      Requirements:
      - Tone: Engaging, friendly, helpful, slightly more casual than LinkedIn.
      - Structure: Question/Hook -> Brief explanation -> Benefit of reading more.
      - Length: 100-150 words.
      - Hashtags: 2-3 broad tags.
      - Content:
      ${plainText}
    `;

        const [linkedinPost, facebookPost] = await Promise.all([
            this.claude.generate(linkedinPrompt, "claude-3-5-sonnet-20241022"),
            this.claude.generate(facebookPrompt, "claude-3-5-sonnet-20241022"),
        ]);

        // Validation: Ensure we didn't get empty responses
        if (!linkedinPost || !facebookPost) {
            throw new Error("Failed to generate social content for one or more platforms.");
        }

        return {
            linkedin: linkedinPost,
            facebook: facebookPost,
        };
    }

    async publishToAll(content: { title: string; text: string; imageUrl?: string; link?: string }) {
        console.log(`Publishing social posts for: ${content.title}`);

        // This is a placeholder for the actual social publishing logic.
        // In the n8n flow, this likely hits a webhook or a specialized API.
        const payload = {
            token: this.uploadToken,
            platforms: ["facebook", "linkedin", "instagram"],
            content: {
                text: `${content.text}\n\nRead more: ${content.link}`,
                media_url: content.imageUrl,
            },
            facebook_page_id: this.fbPageId,
        };

        // Example of hitting a social orchestrator API
        // const response = await fetch("https://api.social-orchestrator.com/v1/publish", {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify(payload),
        // });

        // For now, we return a success mock
        return { status: "queued", platforms: payload.platforms };
    }
}
