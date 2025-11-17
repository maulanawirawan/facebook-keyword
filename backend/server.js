const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');

const app = express();
const PORT = process.env.API_PORT || 3000;

// Database connection pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'fbadmin',
    password: process.env.DB_PASSWORD || 'fbpass123',
    database: process.env.DB_NAME || 'facebook_data',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({
            status: 'healthy',
            database: 'connected',
            timestamp: result.rows[0].now
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

// ========================================
// STATISTICS ENDPOINTS
// ========================================

// Get overall statistics
app.get('/api/stats', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM get_engagement_summary()');
        const stats = {};
        result.rows.forEach(row => {
            stats[row.metric.toLowerCase().replace(/\s+/g, '_')] = parseInt(row.value);
        });
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get daily statistics
app.get('/api/stats/daily', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 30;
        const result = await pool.query(
            'SELECT * FROM v_daily_stats LIMIT $1',
            [limit]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get query statistics
app.get('/api/stats/queries', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM v_query_stats');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// POSTS ENDPOINTS
// ========================================

// Get all posts with pagination
app.get('/api/posts', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const sortBy = req.query.sort || 'scraped_at';
        const order = req.query.order || 'DESC';

        // Count total
        const countResult = await pool.query('SELECT COUNT(*) FROM posts');
        const total = parseInt(countResult.rows[0].count);

        // Get posts
        const result = await pool.query(
            `SELECT id, author, SUBSTRING(text, 1, 200) as text_preview,
                    reactions, comments, shares, views,
                    post_url, share_url, image_url,
                    location, music_title, music_artist,
                    timestamp, query_used, filter_year, scraped_at
             FROM posts
             ORDER BY ${sortBy} ${order}
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        res.json({
            data: result.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single post by ID
app.get('/api/posts/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM posts WHERE id = $1',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Get comments for this post
        const comments = await pool.query(
            'SELECT * FROM comments WHERE post_url = $1 ORDER BY comment_reactions DESC LIMIT 50',
            [result.rows[0].post_url]
        );

        res.json({
            post: result.rows[0],
            comments: comments.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get top posts
app.get('/api/posts/top/engagement', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const result = await pool.query(
            'SELECT * FROM v_top_posts LIMIT $1',
            [limit]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search posts
app.get('/api/posts/search', async (req, res) => {
    try {
        const query = req.query.q || '';
        const limit = parseInt(req.query.limit) || 20;

        const result = await pool.query(
            `SELECT id, author, SUBSTRING(text, 1, 200) as text_preview,
                    reactions, comments, shares, post_url, timestamp,
                    location, music_title, music_artist
             FROM posts
             WHERE text ILIKE $1 OR author ILIKE $1
             ORDER BY reactions DESC
             LIMIT $2`,
            [`%${query}%`, limit]
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// COMMENTS ENDPOINTS
// ========================================

// Get all comments with pagination
app.get('/api/comments', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        const countResult = await pool.query('SELECT COUNT(*) FROM comments');
        const total = parseInt(countResult.rows[0].count);

        const result = await pool.query(
            `SELECT id, comment_author, SUBSTRING(comment_text, 1, 150) as comment_text,
                    comment_reactions, comment_timestamp, post_author, post_url
             FROM comments
             ORDER BY created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        res.json({
            data: result.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get top commenters
app.get('/api/comments/top/authors', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const result = await pool.query(
            'SELECT * FROM v_comment_activity LIMIT $1',
            [limit]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// AUTHORS ENDPOINTS
// ========================================

// Get top authors
app.get('/api/authors/top', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const result = await pool.query(
            'SELECT * FROM v_top_authors LIMIT $1',
            [limit]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get author details
app.get('/api/authors/:name', async (req, res) => {
    try {
        const name = decodeURIComponent(req.params.name);

        // Get author stats
        const stats = await pool.query(
            'SELECT * FROM v_top_authors WHERE author = $1',
            [name]
        );

        if (stats.rows.length === 0) {
            return res.status(404).json({ error: 'Author not found' });
        }

        // Get recent posts
        const posts = await pool.query(
            `SELECT id, SUBSTRING(text, 1, 200) as text_preview,
                    reactions, comments, shares, timestamp, post_url,
                    location, music_title, music_artist
             FROM posts
             WHERE author = $1
             ORDER BY scraped_at DESC
             LIMIT 20`,
            [name]
        );

        res.json({
            author: stats.rows[0],
            recent_posts: posts.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// ANALYTICS ENDPOINTS
// ========================================

// Get engagement trends
app.get('/api/analytics/trends', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;

        const result = await pool.query(
            `SELECT
                DATE(scraped_at) as date,
                COUNT(*) as posts,
                SUM(reactions) as reactions,
                SUM(comments) as comments,
                SUM(shares) as shares
             FROM posts
             WHERE scraped_at >= NOW() - INTERVAL '${days} days'
             GROUP BY DATE(scraped_at)
             ORDER BY date ASC`
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get engagement by hour
app.get('/api/analytics/hourly', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                EXTRACT(HOUR FROM scraped_at) as hour,
                COUNT(*) as posts,
                ROUND(AVG(reactions), 2) as avg_reactions
             FROM posts
             WHERE scraped_at IS NOT NULL
             GROUP BY EXTRACT(HOUR FROM scraped_at)
             ORDER BY hour`
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get word cloud data (top words from posts)
app.get('/api/analytics/wordcloud', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;

        const result = await pool.query(
            `SELECT word, COUNT(*) as frequency
             FROM (
                 SELECT LOWER(REGEXP_SPLIT_TO_TABLE(text, E'\\\\s+')) as word
                 FROM posts
                 WHERE text IS NOT NULL
             ) words
             WHERE LENGTH(word) > 3
               AND word NOT IN ('yang', 'untuk', 'dengan', 'dari', 'pada', 'dalam', 'akan', 'adalah', 'tidak', 'this', 'that', 'with', 'have', 'from')
             GROUP BY word
             ORDER BY frequency DESC
             LIMIT $1`,
            [limit]
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// DATA MANAGEMENT ENDPOINTS
// ========================================

// Delete sample/test data
app.delete('/api/cleanup/sample', async (req, res) => {
    try {
        const result = await pool.query(
            "DELETE FROM posts WHERE author = 'Sample Author' OR query_used = 'test query'"
        );

        res.json({
            status: 'success',
            message: `Deleted ${result.rowCount} sample posts`,
            deleted: result.rowCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Delete ALL data (fresh start)
app.delete('/api/cleanup/all', async (req, res) => {
    try {
        console.log('🗑️  Cleaning ALL data from database...');

        // Delete comments first (foreign key constraint)
        const commentsResult = await pool.query('DELETE FROM comments');
        console.log(`   ✓ Deleted ${commentsResult.rowCount} comments`);

        // Delete posts
        const postsResult = await pool.query('DELETE FROM posts');
        console.log(`   ✓ Deleted ${postsResult.rowCount} posts`);

        // Reset sequences (auto-increment IDs)
        await pool.query('ALTER SEQUENCE IF EXISTS posts_id_seq RESTART WITH 1');
        await pool.query('ALTER SEQUENCE IF EXISTS comments_id_seq RESTART WITH 1');
        console.log(`   ✓ Reset ID sequences`);

        res.json({
            status: 'success',
            message: 'All data deleted successfully',
            deleted: {
                posts: postsResult.rowCount,
                comments: commentsResult.rowCount
            }
        });
    } catch (error) {
        console.error('❌ Cleanup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Trigger data import from CSV/JSON files
app.post('/api/import', async (req, res) => {
    try {
        console.log('📥 Import triggered via API...');

        // Import the import function
        const { importAllData } = require('./import.js');

        // Set response headers for streaming
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Send initial response
        res.write(JSON.stringify({
            status: 'started',
            message: 'Import process started...',
            timestamp: new Date().toISOString()
        }) + '\n');

        // Run import in background
        importAllData()
            .then(() => {
                res.write(JSON.stringify({
                    status: 'completed',
                    message: 'Import completed successfully!',
                    timestamp: new Date().toISOString()
                }) + '\n');
                res.end();
            })
            .catch((error) => {
                res.write(JSON.stringify({
                    status: 'error',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }) + '\n');
                res.end();
            });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

// ========================================
// ERROR HANDLING
// ========================================

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// ========================================
// START SERVER
// ========================================

app.listen(PORT, '0.0.0.0', () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 Facebook Analytics API Server');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`🗄️  Database: ${process.env.DB_NAME || 'facebook_data'}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('📊 Available endpoints:');
    console.log('   GET  /api/stats              - Overall statistics');
    console.log('   GET  /api/stats/daily        - Daily statistics');
    console.log('   GET  /api/posts              - All posts (paginated)');
    console.log('   GET  /api/posts/top/engagement - Top posts');
    console.log('   GET  /api/posts/:id          - Single post with comments');
    console.log('   GET    /api/comments           - All comments (paginated)');
    console.log('   GET    /api/authors/top        - Top authors');
    console.log('   GET    /api/analytics/trends   - Engagement trends');
    console.log('   POST   /api/import             - Trigger data import (CSV/JSON)');
    console.log('   DELETE /api/cleanup/sample     - Delete sample/test data');
    console.log('   DELETE /api/cleanup/all        - Delete ALL data (fresh start)');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing server...');
    await pool.end();
    process.exit(0);
});
