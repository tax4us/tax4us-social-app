import { AirtableClient } from "@/lib/clients/airtable-client";
import { TopicsTable, TopicRecord } from "@/components/dashboard/TopicsTable";

export const dynamic = 'force-dynamic';

export default async function TopicsPage() {
    const airtable = new AirtableClient();
    let records: TopicRecord[] = [];

    try {
        // Fetch topics from the main content table
        // tblq7MDqeogrsdInc
        const rawRecords = await airtable.getRecords("tblq7MDqeogrsdInc", {
            maxRecords: 100
        });

        records = rawRecords.map((rec: any) => ({
            id: rec.id,
            fields: rec.fields
        }));
    } catch (e) {
        console.error("Failed to fetch topics", e);
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Topics & Ideas</h2>
                    <p className="text-muted-foreground">
                        Manage your content pipeline and ideation from Airtable.
                    </p>
                </div>
            </div>

            <div className="bg-card border rounded-xl p-6 shadow-sm">
                <TopicsTable data={records} />
            </div>
        </div>
    )
}
