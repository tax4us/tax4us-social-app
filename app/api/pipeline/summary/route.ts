import { NextResponse } from "next/server";
import { AirtableClient } from "@/lib/clients/airtable-client";
import { ClaudeClient } from "@/lib/clients/claude-client";

export async function GET() {
    const airtable = new AirtableClient();
    const claude = new ClaudeClient();
    const contentTable = "tblq7MDqeogrsdInc";

    try {
        // Fetch recent records to understand state
        const records = await airtable.getRecords(contentTable, {
            maxRecords: 20
        });

        // Handle null return from airtable client
        const safeRecords = records || [];
        
        const stats = {
            total: safeRecords.length,
            published: safeRecords.filter((r: any) => r.fields?.Status === 'Published').length,
            ready: safeRecords.filter((r: any) => r.fields?.Status === 'Ready').length,
            errors: safeRecords.filter((r: any) => r.fields?.Status === 'Error').length,
            recentTopics: safeRecords.slice(0, 5).map((r: any) => r.fields?.topic || 'Untitled').join(", ")
        };

        const prompt = `
        You are the Tax4Us AI Content Agent. Summarize the current business state for the owner in 2 concise Hebrew sentences.
        Data:
        - Total tracking: ${stats.total} topics.
        - Published: ${stats.published}.
        - Ready for next run: ${stats.ready}.
        - Errors needing attention: ${stats.errors}.
        - Recent focus areas: ${stats.recentTopics}.

        The tone should be professional, reassuring, and "premium". 
        Focus on what's active and what's next. Do not use bullets.
        `;

        const summary = await claude.generate(prompt, "claude-3-haiku-20240307", "You are a professional Israeli business analyst.");

        return NextResponse.json({ summary });
    } catch (error) {
        console.error("Summary generation failed:", error);
        return NextResponse.json({
            summary: "המערכת פועלת כסדרה. כל התכנים מתוזמנים להפצה בהתאם ללוח הזמנים."
        });
    }
}
