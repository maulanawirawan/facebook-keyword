@echo off
echo ====================================================
echo  APPLY ALL DASHBOARD UPDATES
echo ====================================================
echo.
echo This will:
echo   1. Pull latest changes from Git
echo   2. Update database view with all fields
echo   3. Restart frontend container
echo   4. Clear browser cache recommendation
echo.
pause

echo.
echo [Step 1/4] Pulling latest changes from Git...
git pull origin claude/fix-docker-network-error-015S38gpeWWWie7U7bRMWS1D
echo.

echo [Step 2/4] Updating database view...
(
echo CREATE OR REPLACE VIEW v_top_posts AS
echo SELECT
echo     id,
echo     author,
echo     author_url,
echo     SUBSTRING^(text, 1, 200^) as text_preview,
echo     text,
echo     reactions,
echo     comments,
echo     shares,
echo     views,
echo     ^(reactions + comments * 2 + shares * 3^) as engagement_score,
echo     post_url,
echo     share_url,
echo     image_url,
echo     video_url,
echo     has_image,
echo     has_video,
echo     location,
echo     music_title,
echo     music_artist,
echo     timestamp,
echo     timestamp_iso,
echo     query_used,
echo     filter_year
echo FROM posts
echo WHERE text IS NOT NULL
echo ORDER BY engagement_score DESC
echo LIMIT 100;
) > temp_update.sql

docker exec -i facebook-postgres psql -U fbadmin -d facebook_data < temp_update.sql
del temp_update.sql
echo.

echo [Step 3/4] Restarting frontend container...
docker-compose restart frontend
echo.

echo [Step 4/4] Waiting for services to be ready...
timeout /t 5 >nul
echo.

echo ====================================================
echo ✓ All updates applied successfully!
echo.
echo IMPORTANT: Clear your browser cache for best results
echo   - Chrome/Edge: Ctrl+Shift+Delete
echo   - Or use Incognito/Private mode
echo.
echo Dashboard URLs:
echo   Local:  http://localhost:8081
echo   Mobile: http://YOUR_IP:8081
echo.
echo What's new:
echo   ✓ Simplified professional title
echo   ✓ Fresh data loading (no cache)
echo   ✓ Share URLs (clean facebook.com/share/p/xxx)
echo   ✓ All database fields available
echo ====================================================
echo.

echo Opening dashboard...
timeout /t 2 >nul
start http://localhost:8081

pause
