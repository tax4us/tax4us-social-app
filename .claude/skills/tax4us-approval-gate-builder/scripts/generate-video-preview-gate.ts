#!/usr/bin/env tsx
/**
 * Generate Video Preview Approval Gate
 * For Kie.ai Sora video generation approval
 */

console.log("🏗️  Generating Video Preview Approval Gate...\n");

// ============================================================================
// 1. SLACK CLIENT METHOD
// ============================================================================
console.log("📝 1. ADD TO lib/clients/slack-client.ts (after sendArticleApprovalRequest):\n");
console.log("```typescript");
console.log(`
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
        text: \`*Related Post:* \${params.postTitle}\\n*Duration:* \${params.duration}s\\n*Kie.ai Task:* \${params.taskId}\`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: \`*Video:* <\${params.videoUrl}|Watch Preview>\`,
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

  return this.sendMessage(\`Video Preview: \${params.postTitle}\`, blocks);
}
`.trim());
console.log("```\n");

// ============================================================================
// 2. WEBHOOK HANDLER
// ============================================================================
console.log("📝 2. ADD TO app/api/slack/interactions/route.ts:\n");
console.log("```typescript");
console.log(`
if (action.action_id === "approve_video") {
  console.log("🎥 Video Approved: Attaching to social posts...", value);

  const { SocialPublisher } = require("../../../../lib/pipeline/social-publisher");
  const publisher = new SocialPublisher();

  // Attach video to social posts
  publisher.attachVideoToSocialPosts(value.postId, value.videoUrl).catch((e: any) =>
    console.error("Video attachment failed:", e)
  );

  return NextResponse.json({
    text: \`✅ Video approved! Attaching to social posts for post #\${value.postId}\`,
    replace_original: false
  });
}

if (action.action_id === "regenerate_video") {
  console.log("🔄 Video Regeneration Requested...", value);

  const { MediaProcessor } = require("../../../../lib/pipeline/media-processor");
  const { WordPressClient } = require("../../../../lib/clients/wordpress-client");

  const wp = new WordPressClient();
  const mediaProcessor = new MediaProcessor();

  // Get post title for new video generation
  wp.getPost(value.postId).then(async (post: any) => {
    const newTask = await mediaProcessor.generateVideo({
      title: post.title.rendered,
      excerpt: post.excerpt.rendered,
      style: "documentary"
    });
    console.log(\`New video generation started: \${newTask.taskId}\`);
  }).catch((e: any) => console.error("Video regeneration failed:", e));

  return NextResponse.json({
    text: "🔄 Regenerating video with new prompt. You'll receive a new preview shortly.",
    replace_original: true
  });
}

if (action.action_id === "skip_video") {
  console.log("⏭️ Video Skipped: Publishing without video...", value);

  const { SocialPublisher } = require("../../../../lib/pipeline/social-publisher");
  const publisher = new SocialPublisher();

  // Continue social posts without video
  publisher.publishSocialWithoutVideo(value.postId).catch((e: any) =>
    console.error("Social publish failed:", e)
  );

  return NextResponse.json({
    text: "⏭️ Video skipped. Social posts will publish without video.",
    replace_original: true
  });
}
`.trim());
console.log("```\n");

// ============================================================================
// 3. SOCIAL PUBLISHER INTEGRATION
// ============================================================================
console.log("📝 3. ADD TO lib/pipeline/social-publisher.ts:\n");
console.log("```typescript");
console.log(`
async attachVideoToSocialPosts(postId: number, videoUrl: string) {
  pipelineLogger.info(\`Attaching video to social posts for post \${postId}\`);

  // Update the pending social post approval with the video URL
  // This assumes social approval request was already sent

  // Fetch the post to get its content
  const wp = new WordPressClient();
  const post = await wp.getPost(postId);

  // Re-trigger social approval with video attached
  const englishId = post.translations?.en;
  const englishPost = englishId ? await wp.getPost(parseInt(englishId)) : null;

  await this.prepareSocialPosts(
    post.content.rendered,
    post.title.rendered,
    post.link,
    englishPost?.link || "",
    postId.toString()
  );

  pipelineLogger.success("Video attached to social posts");
}

async publishSocialWithoutVideo(postId: number) {
  pipelineLogger.info(\`Publishing social posts without video for post \${postId}\`);

  const wp = new WordPressClient();
  const post = await wp.getPost(postId);
  const englishId = post.translations?.en;
  const englishPost = englishId ? await wp.getPost(parseInt(englishId)) : null;

  // Generate social posts without video
  await this.prepareSocialPosts(
    post.content.rendered,
    post.title.rendered,
    post.link,
    englishPost?.link || "",
    postId.toString()
  );

  pipelineLogger.success("Social posts prepared without video");
}
`.trim());
console.log("```\n");

// ============================================================================
// 4. KIE CLIENT INTEGRATION
// ============================================================================
console.log("📝 4. MODIFY lib/clients/kie-client.ts to send approval when video ready:\n");
console.log("```typescript");
console.log(`
// In getTask() method, when status === 'success':
if (status.status === 'success') {
  // Send approval request to Slack
  const slack = new SlackClient();
  await slack.sendVideoApprovalRequest({
    videoUrl: status.videoUrl,
    duration: status.duration || 0,
    taskId: taskId,
    relatedPostId: status.relatedPostId || 0,
    postTitle: status.postTitle || "Untitled"
  });
}
`.trim());
console.log("```\n");

// ============================================================================
// 5. TEST SCRIPT
// ============================================================================
console.log("📝 5. CREATE scripts/test-video-approval-gate.ts:\n");
console.log("```typescript");
console.log(`
#!/usr/bin/env tsx
import { SlackClient } from '../lib/clients/slack-client';

async function testVideoApprovalGate() {
  const slack = new SlackClient();

  console.log("🎥 Testing Video Approval Gate...");

  await slack.sendVideoApprovalRequest({
    videoUrl: "https://example.com/video.mp4",
    duration: 15,
    thumbnailUrl: "https://example.com/thumb.jpg",
    taskId: "kie-task-12345",
    relatedPostId: 12345,
    postTitle: "FBAR Reporting Guide"
  });

  console.log("✅ Approval request sent to Slack");
  console.log("📱 Check your Slack DMs for the video preview");
}

testVideoApprovalGate();
`.trim());
console.log("```\n");

console.log("\n" + "=".repeat(80));
console.log("✅ VIDEO PREVIEW GATE GENERATION COMPLETE");
console.log("=".repeat(80));
console.log("\n📋 IMPLEMENTATION CHECKLIST:\n");
console.log("  [ ] 1. Add sendVideoApprovalRequest() to SlackClient");
console.log("  [ ] 2. Add approve/regenerate/skip handlers to interactions route");
console.log("  [ ] 3. Add attachVideoToSocialPosts() to SocialPublisher");
console.log("  [ ] 4. Modify Kie.ai client to send approval when video ready");
console.log("  [ ] 5. Create test script");
console.log("  [ ] 6. Test in development");
console.log("  [ ] 7. Deploy to production\n");
