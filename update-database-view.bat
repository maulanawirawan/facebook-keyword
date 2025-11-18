@echo off
echo ====================================================
echo  UPDATE DATABASE VIEW - Fix Dashboard Display
echo ====================================================
echo.
echo This script will update the database view to include
echo all necessary fields for the dashboard.
echo.
pause

echo Updating database view...
echo.

docker exec -i facebook-postgres psql -U fbadmin -d facebook_data << 'EOF'
-- Update v_top_posts view with all fields
CREATE OR REPLACE VIEW v_top_posts AS
SELECT
    id,
    author,
    author_url,
    SUBSTRING(text, 1, 200) as text_preview,
    text,
    reactions,
    comments,
    shares,
    views,
    (reactions + comments * 2 + shares * 3) as engagement_score,
    post_url,
    share_url,
    image_url,
    video_url,
    has_image,
    has_video,
    location,
    music_title,
    music_artist,
    timestamp,
    timestamp_iso,
    query_used,
    filter_year
FROM posts
WHERE text IS NOT NULL
ORDER BY engagement_score DESC
LIMIT 100;

-- Verify the update
SELECT 'View updated successfully! Total posts: ' || COUNT(*) as status
FROM v_top_posts;
EOF

echo.
echo ====================================================
echo Database view updated!
echo.
echo Now restart the frontend container to apply changes:
echo   docker-compose restart frontend
echo.
echo Then test the dashboard:
echo   Local:  http://localhost:8081
echo   Mobile: http://YOUR_IP:8081
echo ====================================================
echo.
pause
