#!/usr/bin/env tsx
import { SlackClient } from '../lib/clients/slack-client';

async function testLinkedInApprovalGate() {
  const slack = new SlackClient();

  console.log("💼 Testing LinkedIn Approval Gate...");

  await slack.sendLinkedInApprovalRequest({
    content: "📋 FBAR Reporting Guide for 2026\n\nImportant update: All U.S. citizens with foreign bank accounts must file the FBAR report by the deadline.\n\nKey requirements:\n• Foreign accounts exceeding $10,000\n• Electronic filing through FinCEN\n• April 15 deadline (automatic extension to October 15)\n\nRead our comprehensive guide for professional insights.\n\n#USIsraeliTax #FBAR #TaxCompliance #ProfessionalServices",
    hashtags: ["#USIsraeliTax", "#FBAR", "#TaxCompliance"],
    mediaUrl: "https://tax4us.co.il/wp-content/uploads/featured-image.jpg",
    postTitle: "FBAR Reporting Guide for 2026",
    postId: 12345
  });

  console.log("✅ LinkedIn approval request sent to Slack");
  console.log("📱 Check your Slack DMs for the approval message");
}

testLinkedInApprovalGate();
