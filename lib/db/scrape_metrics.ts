import { dbClient } from "./client";
import { ScrapeLog } from "./types";

export async function createScrapeLog(scrapeInfo: ScrapeLog) {
    const pool = dbClient.getPool();
    const {conversation, message} = scrapeInfo;
    const query =
    `INSERT INTO scrape_metrics
        (conversation_id, message)
    VALUES
        ($1, $2)`;
    
    try {
        const result = await pool.query(query, [conversation, message]);

        if (result.rowCount === 0) {
            throw new Error('Failed to create scrape metrics record - no rows created');
        }
    } catch (error) {
        throw new Error(
            `Failed to create scrape metrics record: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}