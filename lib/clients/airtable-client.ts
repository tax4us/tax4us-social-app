export class AirtableClient {
    private apiKey: string;
    private baseId: string;
    private baseUrl: string;

    constructor() {
        this.apiKey = process.env.AIRTABLE_API_KEY || "";
        this.baseId = process.env.AIRTABLE_BASE_ID || "appkZD1ew4aKoBqDM";
        this.baseUrl = `https://api.airtable.com/v1/${this.baseId}`;

        if (!this.apiKey) {
            throw new Error("Missing AIRTABLE_API_KEY in environment variables.");
        }
    }

    async getRecords(tableId: string, options: { filterByFormula?: string; maxRecords?: number } = {}) {
        const params = new URLSearchParams();
        if (options.filterByFormula) params.append("filterByFormula", options.filterByFormula);
        if (options.maxRecords) params.append("maxRecords", options.maxRecords.toString());

        const response = await fetch(`${this.baseUrl}/${tableId}?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Airtable API Error: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        return data.records;
    }

    async updateRecord(tableId: string, recordId: string, fields: any) {
        const response = await fetch(`${this.baseUrl}/${tableId}/${recordId}`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ fields }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Airtable API Error: ${JSON.stringify(error)}`);
        }

        return await response.json();
    }

    async createRecord(tableId: string, fields: any) {
        const response = await fetch(`${this.baseUrl}/${tableId}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ fields }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Airtable API Error: ${JSON.stringify(error)}`);
        }

        return await response.json();
    }
}
