-- Optimize chats table with proper indexing and constraints

-- Add updated_at column if it doesn't exist
ALTER TABLE chats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chats_user_id_date ON chats(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_chats_user_id_updated_at ON chats(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_date ON chats(date DESC);
CREATE INDEX IF NOT EXISTS idx_chats_cuddle_id ON chats(cuddle_id);

-- Add constraints to ensure data integrity
ALTER TABLE chats ADD CONSTRAINT IF NOT EXISTS chk_cuddle_id_valid 
  CHECK (cuddle_id IN ('ellie-sr', 'olly-sr', 'ellie-jr', 'olly-jr'));

-- Add constraint to limit message array size (prevent excessive storage)
ALTER TABLE chats ADD CONSTRAINT IF NOT EXISTS chk_messages_limit 
  CHECK (jsonb_array_length(messages) <= 200);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
CREATE TRIGGER update_chats_updated_at
    BEFORE UPDATE ON chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE chats IS 'Stores user chat conversations with companions';
COMMENT ON COLUMN chats.messages IS 'JSON array of chat messages limited to 200 entries';
COMMENT ON COLUMN chats.cuddle_id IS 'Companion identifier: ellie-sr, olly-sr, ellie-jr, olly-jr';
COMMENT ON COLUMN chats.updated_at IS 'Auto-updated timestamp for cache invalidation';

-- Create partial index for recent chats (performance boost for common queries)
CREATE INDEX IF NOT EXISTS idx_chats_recent ON chats(user_id, date DESC) 
  WHERE date >= CURRENT_DATE - INTERVAL '30 days';

-- If using environment prefixes, create similar indexes for prefixed tables
-- Example for dev environment (uncomment if needed):
-- CREATE INDEX IF NOT EXISTS idx_dev_chats_user_id_date ON "dev-chats"(user_id, date DESC);
-- CREATE INDEX IF NOT EXISTS idx_dev_chats_user_id_updated_at ON "dev-chats"(user_id, updated_at DESC);