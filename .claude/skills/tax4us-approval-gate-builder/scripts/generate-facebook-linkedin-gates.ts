#!/usr/bin/env tsx
/**
 * Generate Facebook & LinkedIn Separate Approval Gates
 * Splits combined social gate into platform-specific gates
 */

console.log("🏗️  Generating Facebook & LinkedIn Approval Gates...\n");

// ============================================================================
// FACEBOOK GATE
// ============================================================================
console.log("=" + "=".repeat(79));
console.log("FACEBOOK APPROVAL GATE");
console.log("=" + "=".repeat(79) + "\n");

console.log("📝 1. ADD TO lib/clients/slack-client.ts:\n");
console.log("```typescript");
console.log(`
async sendFacebookApprovalRequest(params: {
  content: string;
  hashtags: string[];
  mediaUrl?: string;
  postTitle: string;
  postId: number;
}) {
  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📘 Facebook Post Ready",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: \`*Related Post:* \${params.postTitle}\\n*Hashtags:* \${params.hashtags.join(" ")}\`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: \`*Post Preview:*\\\n\\\`\\\`\\\`\${params.content}\\\`\\\`\\\`\`,
      },
    },
  ];

  if (params.mediaUrl) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: \`*Media:* <\${params.mediaUrl}|View>\`,
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
          action: "approve_facebook",
          postId: params.postId,
          content: params.content,
          mediaUrl: params.mediaUrl
        }),
        action_id: "approve_facebook",
        style: "primary",
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "✏️ Edit",
          emoji: true,
        },
        action_id: "edit_facebook",
        value: JSON.stringify({ action: "edit_facebook", postId: params.postId }),
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "❌ Cancel",
          emoji: true,
        },
        action_id: "cancel_facebook",
        value: JSON.stringify({ action: "cancel_facebook", postId: params.postId }),
        style: "danger",
      },
    ],
  });

  return this.sendMessage(\`Facebook Post: \${params.postTitle}\`, blocks);
}
`.trim());
console.log("```\n");

// ============================================================================
// LINKEDIN GATE
// ============================================================================
console.log("\n" + "=" + "=".repeat(79));
console.log("LINKEDIN APPROVAL GATE");
console.log("=" + "=".repeat(79) + "\n");

console.log("📝 2. ADD TO lib/clients/slack-client.ts:\n");
console.log("```typescript");
console.log(`
async sendLinkedInApprovalRequest(params: {
  content: string;
  hashtags: string[];
  mediaUrl?: string;
  postTitle: string;
  postId: number;
}) {
  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "💼 LinkedIn Post Ready",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: \`*Related Post:* \${params.postTitle}\\n*Hashtags:* \${params.hashtags.join(" ")}\`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: \`*Post Preview:*\\\n\\\`\\\`\\\`\${params.content}\\\`\\\`\\\`\`,
      },
    },
  ];

  if (params.mediaUrl) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: \`*Media:* <\${params.mediaUrl}|View>\`,
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
          action: "approve_linkedin",
          postId: params.postId,
          content: params.content,
          mediaUrl: params.mediaUrl
        }),
        action_id: "approve_linkedin",
        style: "primary",
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "✏️ Edit",
          emoji: true,
        },
        action_id: "edit_linkedin",
        value: JSON.stringify({ action: "edit_linkedin", postId: params.postId }),
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "❌ Cancel",
          emoji: true,
        },
        action_id: "cancel_linkedin",
        value: JSON.stringify({ action: "cancel_linkedin", postId: params.postId }),
        style: "danger",
      },
    ],
  });

  return this.sendMessage(\`LinkedIn Post: \${params.postTitle}\`, blocks);
}
`.trim());
console.log("```\n");

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================
console.log("\n" + "=" + "=".repeat(79));
console.log("WEBHOOK HANDLERS");
console.log("=" + "=".repeat(79) + "\n");

console.log("📝 3. ADD TO app/api/slack/interactions/route.ts:\n");
console.log("```typescript");
console.log(`
// Facebook handlers
if (action.action_id === "approve_facebook") {
  console.log("📘 Facebook Post Approved: Publishing...", value);

  // Publish to Facebook via Upload-Post API
  const formData = new FormData();
  formData.append('title', value.content);
  formData.append('user', 'tax4us');
  formData.append('platform[]', 'facebook');
  if (value.mediaUrl) {
    formData.append('image_url', value.mediaUrl);
    formData.append('type', 'image');
  }

  fetch('https://api.upload-post.com/api/upload_text', {
    method: 'POST',
    headers: { 'Authorization': \`Apikey \${process.env.UPLOAD_POST_TOKEN}\` },
    body: formData
  }).catch(e => console.error("Facebook publish failed:", e));

  return NextResponse.json({
    text: \`✅ Facebook post approved! Publishing now.\`,
    replace_original: false
  });
}

if (action.action_id === "edit_facebook") {
  return NextResponse.json({
    text: "✏️ Edit requested. Please provide your changes in a reply.",
    replace_original: false
  });
}

if (action.action_id === "cancel_facebook") {
  return NextResponse.json({
    text: "❌ Facebook post cancelled.",
    replace_original: true
  });
}

// LinkedIn handlers
if (action.action_id === "approve_linkedin") {
  console.log("💼 LinkedIn Post Approved: Publishing...", value);

  // Publish to LinkedIn via Upload-Post API
  const formData = new FormData();
  formData.append('title', value.content);
  formData.append('user', 'tax4us');
  formData.append('platform[]', 'linkedin');
  if (value.mediaUrl) {
    formData.append('image_url', value.mediaUrl);
    formData.append('type', 'image');
  }

  fetch('https://api.upload-post.com/api/upload_text', {
    method: 'POST',
    headers: { 'Authorization': \`Apikey \${process.env.UPLOAD_POST_TOKEN}\` },
    body: formData
  }).catch(e => console.error("LinkedIn publish failed:", e));

  return NextResponse.json({
    text: \`✅ LinkedIn post approved! Publishing now.\`,
    replace_original: false
  });
}

if (action.action_id === "edit_linkedin") {
  return NextResponse.json({
    text: "✏️ Edit requested. Please provide your changes in a reply.",
    replace_original: false
  });
}

if (action.action_id === "cancel_linkedin") {
  return NextResponse.json({
    text: "❌ LinkedIn post cancelled.",
    replace_original: true
  });
}
`.trim());
console.log("```\n");

console.log("\n" + "=".repeat(80));
console.log("✅ FACEBOOK & LINKEDIN GATES GENERATION COMPLETE");
console.log("=".repeat(80));
console.log("\n📋 ALL 7 APPROVAL GATES NOW AVAILABLE:\n");
console.log("  ✅ 1. Topic Proposal (existing)");
console.log("  ✅ 2. Hebrew Article Preview (implemented today)");
console.log("  📝 3. Video Preview (generated - ready to implement)");
console.log("  📝 4. Facebook Post (generated - ready to implement)");
console.log("  📝 5. LinkedIn Post (generated - ready to implement)");
console.log("  ✅ 6. Podcast Episode (existing)");
console.log("  ✅ 7. Social Combined (existing)\n");
console.log("🎯 Status: 4 implemented, 3 ready to implement\n");
