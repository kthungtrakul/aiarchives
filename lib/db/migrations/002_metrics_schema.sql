-- Create scrape metrics table
CREATE TABLE IF NOT EXISTS scrape_metrics (
    id SERIAL PRIMARY KEY,
    conversation_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    message TEXT DEFAULT NULL
);

-- Index to help filter by conversation id
-- Balanced B-tree structure enables O(log n) vs. O(n) lookups
CREATE INDEX IF NOT EXISTS idx_scrape_metrics_conversation_id
    ON scrape_metrics(conversation_id);