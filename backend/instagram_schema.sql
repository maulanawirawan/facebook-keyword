-- Instagram Posts Table
CREATE TABLE IF NOT EXISTS instagram_posts (
    id SERIAL PRIMARY KEY,
    author VARCHAR(255),
    author_profile_link TEXT,
    author_followers INTEGER DEFAULT 0,
    location TEXT,
    location_short VARCHAR(255),
    location_lat DECIMAL(10, 7),
    location_lng DECIMAL(10, 7),
    location_city VARCHAR(255),
    location_address TEXT,
    audio_source TEXT,
    timestamp BIGINT,
    timestamp_iso TIMESTAMP,
    timestamp_wib VARCHAR(100),
    post_url TEXT UNIQUE NOT NULL,
    content_text TEXT,
    image_url TEXT,
    video_url TEXT,
    image_source VARCHAR(50),
    video_source VARCHAR(50),
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    query_used VARCHAR(255),
    hashtag_source VARCHAR(255),
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    scraped_at_wib VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at_wib VARCHAR(100),
    update_count INTEGER DEFAULT 0,
    _previous_engagement DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Instagram Comments Table
CREATE TABLE IF NOT EXISTS instagram_comments (
    id SERIAL PRIMARY KEY,
    post_url TEXT NOT NULL,
    post_author VARCHAR(255),
    comment_author VARCHAR(255),
    comment_author_link TEXT,
    comment_text TEXT,
    comment_likes INTEGER DEFAULT 0,
    comment_timestamp TIMESTAMP,
    comment_timestamp_wib VARCHAR(100),
    is_reply BOOLEAN DEFAULT FALSE,
    parent_comment_author VARCHAR(255),
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_url) REFERENCES instagram_posts(post_url) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_instagram_posts_author ON instagram_posts(author);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_hashtag ON instagram_posts(query_used);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_timestamp ON instagram_posts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_likes ON instagram_posts(likes DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_scraped_at ON instagram_posts(scraped_at DESC);

CREATE INDEX IF NOT EXISTS idx_instagram_comments_post_url ON instagram_comments(post_url);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_author ON instagram_comments(comment_author);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_timestamp ON instagram_comments(comment_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_comments_is_reply ON instagram_comments(is_reply);

-- Add comment to tables
COMMENT ON TABLE instagram_posts IS 'Instagram posts scraped from hashtags (politik Indonesia)';
COMMENT ON TABLE instagram_comments IS 'Instagram comments from scraped posts';
