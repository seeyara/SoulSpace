-- Add unique constraint to chats table
ALTER TABLE chats ADD CONSTRAINT unique_user_date UNIQUE (user_id, date);
