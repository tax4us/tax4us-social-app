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

    async sendTopicApprovalRequest(params: {
        topic: string;
        audience: string;
        reasoning: string;
        draftId: number;
    }) {
        const blocks: any[] = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "🔔 Content Topic Proposal",
                    emoji: true,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Proposed Topic:* ${params.topic}\n*Target Audience:* ${params.audience}\n\n*Reasoning:* ${params.reasoning}`,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*WordPress Draft:* <https://tax4us.co.il/wp-admin/post.php?post=${params.draftId}&action=edit|Review Draft (ID: ${params.draftId})>`,
                },
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "✅ Approve & Generate",
                            emoji: true,
                        },
                        value: JSON.stringify({
                            action: "approve_topic",
                            topic: params.topic,
                            draftId: params.draftId
                        }),
                        action_id: "approve_topic",
                        style: "primary",
                    },
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "❌ Reject",
                            emoji: true,
                        },
                        value: JSON.stringify({ action: "reject_topic", draftId: params.draftId }),
                        action_id: "reject_topic",
                        style: "danger",
                    },
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "✍️ Give Feedback",
                            emoji: true,
                        },
                        action_id: "feedback_topic",
                        value: JSON.stringify({ action: "feedback_topic", draftId: params.draftId }),
                    }
                ],
            },
        ];

        return this.sendMessage(`New topic proposal: ${params.topic}`, blocks);
    }

    async sendArticleApprovalRequest(params: {
        title: string;
        excerpt: string;
        seoScore: number;
        focusKeyword: string;
        draftUrl: string;
        wordCount: number;
        draftId: number;
    }) {
        const blocks: any[] = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "📝 Hebrew Article Preview",
                    emoji: true,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Title:* ${params.title}\n*Word Count:* ${params.wordCount} words\n*SEO Score:* ${params.seoScore}%\n*Focus Keyword:* ${params.focusKeyword}`,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Preview:*\n${params.excerpt}...`,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*WordPress Draft:* <${params.draftUrl}|Review Full Article>`,
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
                        value: JSON.stringify({
                            action: "approve_article",
                            draftId: params.draftId,
                            seoScore: params.seoScore
                        }),
                        action_id: "approve_article",
                        style: "primary",
                    },
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "❌ Reject & Regenerate",
                            emoji: true,
                        },
                        value: JSON.stringify({
                            action: "reject_article",
                            draftId: params.draftId
                        }),
                        action_id: "reject_article",
                        style: "danger",
                    },
                ],
            },
        ];

        return this.sendMessage(`Article Preview: ${params.title}`, blocks);
    }

    async sendVideoApprovalRequest(params: {
        videoUrl: string;
        duration: number;
        thumbnailUrl?: string;
        taskId: string;
        relatedPostId: number;
        postTitle: string;
    }) {
        const blocks: any[] = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "🎥 Video Preview Ready",
                    emoji: true,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Related Post:* ${params.postTitle}\n*Duration:* ${params.duration}s\n*Kie.ai Task:* ${params.taskId}`,
                },
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Video:* <${params.videoUrl}|Watch Preview>`,
                },
            },
            {
                type: "actions",
                elements: [
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "✅ Approve & Use",
                            emoji: true,
                        },
                        value: JSON.stringify({
                            action: "approve_video",
                            videoUrl: params.videoUrl,
                            taskId: params.taskId,
                            postId: params.relatedPostId
                        }),
                        action_id: "approve_video",
                        style: "primary",
                    },
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "🔄 Regenerate",
                            emoji: true,
                        },
                        value: JSON.stringify({
                            action: "regenerate_video",
                            taskId: params.taskId,
                            postId: params.relatedPostId
                        }),
                        action_id: "regenerate_video",
                    },
                    {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "⏭️ Skip Video",
                            emoji: true,
                        },
                        value: JSON.stringify({
                            action: "skip_video",
                            postId: params.relatedPostId
                        }),
                        action_id: "skip_video",
                        style: "danger",
                    },
                ],
            },
        ];

        return this.sendMessage(`Video Preview: ${params.postTitle}`, blocks);
    }
}
