import { AirtableClient } from "../clients/airtable-client";
import { TopicManager } from "./topic-manager";
import { pipelineLogger } from "./logger";

export class DataAutoHealer {
    private airtable: AirtableClient;
    private topicManager: TopicManager;
    private contentTable: string = "tblq7MDqeogrsdInc";

    constructor() {
        this.airtable = new AirtableClient();
        this.topicManager = new TopicManager();
    }

    async healIncompleteRecords() {
        pipelineLogger.info("DataAutoHeal: Starting global sanity check...");

        try {
            // Find records missing Title EN or Outline
            const records = await this.airtable.getRecords(this.contentTable, {
                filterByFormula: "OR({Title EN}='', {Outline}='')"
            });

            if (records.length === 0) {
                pipelineLogger.info("DataAutoHeal: All records healthy. No action needed.");
                return;
            }

            pipelineLogger.warn(`DataAutoHeal: Found ${records.length} incomplete records. Initializing healing protocol...`);

            for (const rec of records) {
                const topicId = rec.id;
                const topicName = rec.fields["topic"] || "Unspecified Topic";

                pipelineLogger.agent(`Healing record ${topicId}: "${topicName}"`, topicId);

                try {
                    // Re-run research and plan to fill the gaps
                    const mockTopic = {
                        id: topicId,
                        topic: topicName,
                        audience: rec.fields["audience"] || "Small business owners in Israel",
                        language: rec.fields["lang"] || "he",
                        status: "ready"
                    } as any;

                    const plan = await this.topicManager.researchAndPlan(mockTopic);

                    await this.topicManager.updateTopicPlan(topicId, plan);

                    pipelineLogger.info(`DataAutoHeal: Successfully enriched "${topicName}".`, topicId);
                } catch (error: any) {
                    pipelineLogger.error(`DataAutoHeal: Failed to heal ${topicId}: ${error.message}`, topicId);
                }
            }

            pipelineLogger.info("DataAutoHeal: Finished sanity check.");
        } catch (error: any) {
            pipelineLogger.error(`DataAutoHeal: Protocol Error: ${error.message}`);
        }
    }
}
