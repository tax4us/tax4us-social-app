export class SlackClient {
    private token: string;
    private channelId: string = "U09NNMEDNEQ"; // Ben's User ID direct destination (Slack resolves to DM)
    private static BEN_USER_ID: string = "U09NNMEDNEQ"; // Ben's Slack User ID from n8n 


    constructor() {
        this.token = process.env.SLACK_BOT_TOKEN || "";
    }

    async sendMessage(text: string, blocks?: any[]) {
        if (!this.token) {
            console.warn("Slack bot token not found. Skipping notification.");
            return;
        }



        try {
            const response = await fetch("https://slack.com/api/chat.postMessage", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.token}`,
                },
                body: JSON.stringify({
                    channel: this.channelId,
                    text,
                    blocks,
                }),
            });

            const data = await response.json();
            if (!data.ok) {
                throw new Error(`Slack API error: ${data.error}`);
            }
            return data;
        } catch (error) {
            console.error("Slack notification failed:", error);
        }
    }

    async sendAudioReady(title: string, episodeNumber: number, audioUrl: string) {
        const blocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "🎙️ Podcast Audio Ready!",
                    emoji: true,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Episode:* ${title} (#${episodeNumber})\n*Audio URL:* <${audioUrl}|Listen Here>`,
                },
            },
        ];
        return this.sendMessage(`Podcast audio ready: ${title}`, blocks);
    }

    async sendApprovalRequest(title: string, episodeNumber: number, episodeId: string) {
        const blocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "🚀 Ready to Publish?",
                    emoji: true,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Episode:* ${title} (#${episodeNumber})\n\nAudio is uploaded as a **Draft**. Approve to publish immediately?`,
                },
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "✅ Approve & Publish",
                            emoji: true,
                        },
                        value: JSON.stringify({ action: "publish", episodeId, title, episodeNumber }),
                        action_id: "approve_publish",
                        style: "primary",
                    },
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "❌ Cancel",
                            emoji: true,
                        },
                        value: JSON.stringify({ action: "cancel", episodeId }),
                        action_id: "cancel_publish",
                        style: "danger",
                    },
                ],
            },
        ];
        return this.sendMessage(`Approval needed for episode: ${title}`, blocks);
    }

    async sendPublishConfirmation(title: string, episodeNumber: number, audioUrl: string) {
        const blocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "🎉 Episode Published on Captivate!",
                    emoji: true,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Episode:* ${title} (#${episodeNumber})\n*Link:* <${audioUrl}|View on Captivate>`,
                },
            },
        ];
        return this.sendMessage(`Episode published: ${title}`, blocks);
    }

    async sendErrorNotification(context: string, error: any) {
        const blocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "❌ Podcast Pipeline Error",
                    emoji: true,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Context:* ${context}\n*Error:* \`${error.message || JSON.stringify(error)}\``,
                },
            },
        ];
        return this.sendMessage(`Error in podcast pipeline: ${context}`, blocks);
    }

    async sendSocialApprovalRequest(params: {
        hebrewHeadline: string;
        englishHeadline: string;
        hebrewTeaser: string;
        hebrewUrl: string;
        englishUrl: string;
        facebookPost: string;
        videoUrl?: string;
        videoTaskId?: string;
        topicId: string;
    }) {
        const blocks: any[] = [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `Hey <@${SlackClient.BEN_USER_ID}>, a new social post is ready for your review! 🚀`,
                },
            },
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "📢 Social Post Approval",
                    emoji: true,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Hebrew Headline:* ${params.hebrewHeadline}\n*English Headline:* ${params.englishHeadline}\n\n*Teaser:* ${params.hebrewTeaser}`,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Links:*\n• Hebrew: ${params.hebrewUrl}\n• English: ${params.englishUrl}`,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Full Post Preview:*\n\`\`\`${params.facebookPost}\`\`\``,
                },
            }
        ];

        if (params.videoUrl) {
            blocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Video Generated:* <${params.videoUrl}|Watch Video> 🎥`,
                },
            });
        } else {
            blocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Video Status:* ⏳ Still generating the Sora video. You can approve the text now, and the video will be attached upon publication.`,
                },
            });
        }

        blocks.push({
            type: "actions",
            elements: [
                {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "✅ Approve & Post",
                        emoji: true,
                    },
                    value: JSON.stringify({
                        action: "publish_social",
                        topicId: params.topicId,
                        platforms: ["facebook", "linkedin"],
                        content: params.facebookPost,
                        videoUrl: params.videoUrl,
                        videoTaskId: params.videoTaskId
                    }),
                    action_id: "approve_social",
                    style: "primary",
                },
                {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "❌ Cancel",
                        emoji: true,
                    },
                    value: JSON.stringify({ action: "cancel_social", topicId: params.topicId }),
                    action_id: "cancel_social",
                    style: "danger",
                },
            ],
        });

        return this.sendMessage(`Social Post Approval Needed`, blocks);
    }
}
