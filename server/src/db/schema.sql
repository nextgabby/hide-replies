-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  x_user_id VARCHAR(255) UNIQUE NOT NULL,
  x_username VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP NOT NULL,
  monitoring_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Keywords to filter
CREATE TABLE IF NOT EXISTS keywords (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  keyword VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, keyword)
);

-- Hidden replies log
CREATE TABLE IF NOT EXISTS hidden_replies (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  original_tweet_id VARCHAR(255) NOT NULL,
  reply_id VARCHAR(255) UNIQUE NOT NULL,
  reply_author_username VARCHAR(255),
  reply_text TEXT,
  matched_keyword VARCHAR(255),
  hidden_at TIMESTAMP DEFAULT NOW(),
  unhidden_at TIMESTAMP,
  is_hidden BOOLEAN DEFAULT true
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hidden_replies_user_id ON hidden_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_keywords_user_id ON keywords(user_id);
CREATE INDEX IF NOT EXISTS idx_hidden_replies_is_hidden ON hidden_replies(is_hidden);
