#!/usr/bin/env tsx
import { SlackClient } from '../lib/clients/slack-client';

async function testFacebookApprovalGate() {
  const slack = new SlackClient();

  console.log("📘 Testing Facebook Approval Gate...");

  await slack.sendFacebookApprovalRequest({
    content: "🔍 מדריך FBAR לשנת 2026\n\n💡 הגשת דוח FBAR היא חובה על כל אזרח אמריקאי המחזיק בחשבונות בנק זרים.\n\nקראו את המאמר המלא באתר שלנו לפרטים נוספים.",
    hashtags: ["#FBAR", "#מסארהב", "#ישראליםבאמריקה"],
    mediaUrl: "https://tax4us.co.il/wp-content/uploads/featured-image.jpg",
    postTitle: "מדריך להגשת FBAR לשנת 2026",
    postId: 12345
  });

  console.log("✅ Facebook approval request sent to Slack");
  console.log("📱 Check your Slack DMs for the approval message");
}

testFacebookApprovalGate();
