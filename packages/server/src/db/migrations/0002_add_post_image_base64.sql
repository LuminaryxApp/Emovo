-- Add image_base64 column to posts table for photo posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_base64 TEXT;
