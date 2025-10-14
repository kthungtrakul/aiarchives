import { dbClient } from "./client";

export async function createScrapeLog(conversationId: string, message: string) : Promise<void> {
    const pool = dbClient.getPool();
    const query =
    `INSERT INTO scrape_metrics
        (conversation_id, timestamp, message)
    VALUES
        ($1, NOW(), $2)`;
    
    try {
        const result = await pool.query(query, [conversationId, message]);
        if (result.rowCount === 0) {
            throw new Error('Failed to create scrape metrics record - no rows created');
        }

        return Promise.resolve();
    } catch (error) {
        return Promise.reject(
            `Failed to create scrape metrics record: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}