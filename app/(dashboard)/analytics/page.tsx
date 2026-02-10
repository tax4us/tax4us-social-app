import { AirtableClient } from "@/lib/clients/airtable-client";
import { StatusDistributionChart, ContentGrowthChart } from "@/components/dashboard/AnalyticsCharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
    const airtable = new AirtableClient();
    let records: any[] = [];

    try {
        records = await airtable.getRecords("tblq7MDqeogrsdInc", { maxRecords: 100 });
    } catch (e) {
        console.error("Failed to fetch analytics data", e);
    }

    // Process Status Distribution
    const statusCounts = records.reduce((acc: any, rec: any) => {
        const status = rec.fields.Status || "Unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

    const statusData = Object.keys(statusCounts).map(name => ({
        name,
        value: statusCounts[name]
    }));

    // Process Growth over time (Simple month-based grouping from createdTime)
    // Airtable returns createdTime by default in most cases, or we can use a field if available
    const growthData = records
        .map((rec: any) => ({
            date: new Date(rec.createdTime || Date.now()).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            month: new Date(rec.createdTime || Date.now()).getMonth(),
            year: new Date(rec.createdTime || Date.now()).getFullYear()
        }))
        .sort((a, b) => (a.year - b.year) || (a.month - b.month))
        .reduce((acc: any[], curr) => {
            const existing = acc.find(a => a.date === curr.date);
            if (existing) {
                existing.count += 1;
            } else {
                acc.push({ date: curr.date, count: 1 });
            }
            return acc;
        }, []);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Content Performance</h2>
                    <p className="text-muted-foreground">
                        How your content is growing over time.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="rounded-xl shadow-sm border-none bg-primary text-primary-foreground">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{records.length}</div>
                        <p className="text-xs opacity-70">Articles in library</p>
                    </CardContent>
                </Card>
                <Card className="rounded-xl shadow-sm border-none bg-secondary text-secondary-foreground">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {Math.round((records.filter(r => r.fields.Status === 'Done').length / records.length) * 100 || 0)}%
                        </div>
                        <p className="text-xs opacity-70">Articles fully processed</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 rounded-xl shadow-sm">
                    <CardHeader>
                        <CardTitle>Content Growth</CardTitle>
                        <CardDescription>New articles added each month</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ContentGrowthChart data={growthData} />
                    </CardContent>
                </Card>
                <Card className="col-span-3 rounded-xl shadow-sm">
                    <CardHeader>
                        <CardTitle>Content Status</CardTitle>
                        <CardDescription>Where your articles are right now</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <StatusDistributionChart data={statusData} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
