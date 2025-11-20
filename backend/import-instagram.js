const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'fbadmin',
    password: process.env.DB_PASSWORD || 'fbpass123',
    database: process.env.DB_NAME || 'facebook_data',
});

// Instagram data folder (adjust path as needed)
const INSTAGRAM_DATA_FOLDER = process.env.INSTAGRAM_DATA_FOLDER || '../instagram_hashtag_data';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📷 Instagram Data Import Script');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

async function initializeTables() {
    console.log('\n📋 Initializing Instagram database tables...');

    const schemaPath = path.join(__dirname, 'instagram_schema.sql');

    if (!fs.existsSync(schemaPath)) {
        console.error('❌ instagram_schema.sql not found!');
        process.exit(1);
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');

    try {
        await pool.query(schema);
        console.log('✅ Instagram tables initialized successfully\n');
    } catch (error) {
        console.error('❌ Error initializing tables:', error.message);
        throw error;
    }
}

async function importPostsFromJSON(filePath) {
    console.log(`\n📥 Importing posts from: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  File not found: ${filePath}`);
        return { imported: 0, skipped: 0, errors: 0 };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const posts = JSON.parse(content);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    console.log(`   Total posts in file: ${posts.length}`);

    for (const post of posts) {
        try {
            // Check if post already exists
            const checkResult = await pool.query(
                'SELECT id FROM instagram_posts WHERE post_url = $1',
                [post.post_url]
            );

            if (checkResult.rows.length > 0) {
                // Update existing post
                await pool.query(`
                    UPDATE instagram_posts SET
                        author = $1,
                        author_profile_link = $2,
                        author_followers = $3,
                        location = $4,
                        location_short = $5,
                        location_lat = $6,
                        location_lng = $7,
                        location_city = $8,
                        location_address = $9,
                        audio_source = $10,
                        timestamp = $11,
                        timestamp_iso = $12,
                        timestamp_wib = $13,
                        content_text = $14,
                        image_url = $15,
                        video_url = $16,
                        image_source = $17,
                        video_source = $18,
                        likes = $19,
                        comments = $20,
                        views = $21,
                        query_used = $22,
                        hashtag_source = $23,
                        updated_at = $24,
                        updated_at_wib = $25,
                        update_count = $26,
                        _previous_engagement = $27
                    WHERE post_url = $28
                `, [
                    post.author,
                    post.author_profile_link,
                    post.author_followers || 0,
                    post.location,
                    post.location_short,
                    post.location_lat,
                    post.location_lng,
                    post.location_city,
                    post.location_address,
                    post.audio_source,
                    post.timestamp,
                    post.timestamp_iso,
                    post.timestamp_wib,
                    post.content_text,
                    post.image_url,
                    post.video_url,
                    post.image_source || 'N/A',
                    post.video_source || 'N/A',
                    post.likes || 0,
                    post.comments || 0,
                    post.views || 0,
                    post.query_used,
                    post.hashtag_source,
                    post.updated_at || new Date().toISOString(),
                    post.updated_at_wib,
                    post.update_count || 0,
                    post._previous_engagement || 0,
                    post.post_url
                ]);
                skipped++;
            } else {
                // Insert new post
                await pool.query(`
                    INSERT INTO instagram_posts (
                        author, author_profile_link, author_followers,
                        location, location_short, location_lat, location_lng,
                        location_city, location_address, audio_source,
                        timestamp, timestamp_iso, timestamp_wib,
                        post_url, content_text,
                        image_url, video_url, image_source, video_source,
                        likes, comments, views,
                        query_used, hashtag_source,
                        scraped_at, scraped_at_wib,
                        updated_at, updated_at_wib,
                        update_count, _previous_engagement
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                        $11, $12, $13, $14, $15, $16, $17, $18, $19,
                        $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
                    )
                `, [
                    post.author,
                    post.author_profile_link,
                    post.author_followers || 0,
                    post.location,
                    post.location_short,
                    post.location_lat,
                    post.location_lng,
                    post.location_city,
                    post.location_address,
                    post.audio_source,
                    post.timestamp,
                    post.timestamp_iso,
                    post.timestamp_wib,
                    post.post_url,
                    post.content_text,
                    post.image_url,
                    post.video_url,
                    post.image_source || 'N/A',
                    post.video_source || 'N/A',
                    post.likes || 0,
                    post.comments || 0,
                    post.views || 0,
                    post.query_used,
                    post.hashtag_source,
                    post.scraped_at || new Date().toISOString(),
                    post.scraped_at_wib,
                    post.updated_at || new Date().toISOString(),
                    post.updated_at_wib,
                    post.update_count || 0,
                    post._previous_engagement || 0
                ]);
                imported++;
            }
        } catch (error) {
            console.error(`   ❌ Error importing post ${post.post_url}:`, error.message);
            errors++;
        }
    }

    return { imported, skipped, errors };
}

async function importCommentsFromJSON(filePath) {
    console.log(`\n📥 Importing comments from: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  File not found: ${filePath}`);
        return { imported: 0, skipped: 0, errors: 0 };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const comments = JSON.parse(content);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    console.log(`   Total comments in file: ${comments.length}`);

    for (const comment of comments) {
        try {
            // Check if comment already exists (by unique combination)
            const checkResult = await pool.query(
                `SELECT id FROM instagram_comments
                 WHERE post_url = $1 AND comment_author = $2 AND comment_text = $3`,
                [comment.post_url, comment.comment_author, comment.comment_text]
            );

            if (checkResult.rows.length > 0) {
                skipped++;
                continue;
            }

            // Insert new comment
            await pool.query(`
                INSERT INTO instagram_comments (
                    post_url, post_author,
                    comment_author, comment_author_link,
                    comment_text, comment_likes,
                    comment_timestamp, comment_timestamp_wib,
                    is_reply, parent_comment_author,
                    scraped_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
                comment.post_url,
                comment.post_author,
                comment.comment_author,
                comment.comment_author_link,
                comment.comment_text,
                comment.comment_likes || 0,
                comment.comment_timestamp,
                comment.comment_timestamp_wib,
                comment.is_reply === 'true' || comment.is_reply === true,
                comment.parent_comment_author,
                comment.scraped_at || new Date().toISOString()
            ]);
            imported++;
        } catch (error) {
            console.error(`   ❌ Error importing comment:`, error.message);
            errors++;
        }
    }

    return { imported, skipped, errors };
}

async function main() {
    try {
        // Initialize tables
        await initializeTables();

        // Find Instagram JSON files
        const dataFolders = [
            path.join(INSTAGRAM_DATA_FOLDER, 'discovery'),
            path.join(INSTAGRAM_DATA_FOLDER, 'engagement_v1'),
            path.join(INSTAGRAM_DATA_FOLDER, 'engagement_v2'),
            INSTAGRAM_DATA_FOLDER
        ];

        let totalPostsImported = 0;
        let totalPostsSkipped = 0;
        let totalCommentsImported = 0;
        let totalCommentsSkipped = 0;

        for (const folder of dataFolders) {
            if (!fs.existsSync(folder)) continue;

            console.log(`\n📂 Checking folder: ${folder}`);

            // Import posts
            const postsFile = path.join(folder, 'instagram_posts.json');
            if (fs.existsSync(postsFile)) {
                const postsResult = await importPostsFromJSON(postsFile);
                totalPostsImported += postsResult.imported;
                totalPostsSkipped += postsResult.skipped;
                console.log(`   ✅ Posts: ${postsResult.imported} imported, ${postsResult.skipped} updated`);
            }

            // Import comments
            const commentsFile = path.join(folder, 'instagram_comments.json');
            if (fs.existsSync(commentsFile)) {
                const commentsResult = await importCommentsFromJSON(commentsFile);
                totalCommentsImported += commentsResult.imported;
                totalCommentsSkipped += commentsResult.skipped;
                console.log(`   ✅ Comments: ${commentsResult.imported} imported, ${commentsResult.skipped} skipped`);
            }
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Import completed successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   📝 Total posts imported: ${totalPostsImported}`);
        console.log(`   🔄 Total posts updated: ${totalPostsSkipped}`);
        console.log(`   💬 Total comments imported: ${totalCommentsImported}`);
        console.log(`   ⏭️  Total comments skipped: ${totalCommentsSkipped}`);
        console.log('');

    } catch (error) {
        console.error('\n❌ Import failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run import
main();
