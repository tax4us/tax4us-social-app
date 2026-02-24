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
