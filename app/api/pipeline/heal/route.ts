import { NextRequest, NextResponse } from "next/server";
import { DataAutoHealer } from "@/lib/pipeline/data-healer";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("cron_secret");

    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const healer = new DataAutoHealer();
    // Run healing in background (don't await for response)
    healer.healIncompleteRecords();

    return NextResponse.json({ message: "Healing protocol initiated." });
}
