@echo off
REM =========================================================
REM FIX DATABASE - Create user fbadmin and tables
REM No need to recreate containers!
REM =========================================================

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🔧 Fixing Database (Creating user + tables)
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM Check if container is running
docker ps | findstr facebook-postgres >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL container is not running!
    echo    Run: docker-compose up -d
    exit /b 1
)

echo ✅ Container is running
echo.

REM Step 1: Create role fbadmin
echo 👤 Step 1: Creating role "fbadmin"...
docker exec -it facebook-postgres psql -U postgres -c "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'fbadmin') THEN CREATE ROLE fbadmin WITH LOGIN PASSWORD 'fbpass123'; ALTER ROLE fbadmin CREATEDB; RAISE NOTICE 'Role fbadmin created'; ELSE RAISE NOTICE 'Role fbadmin already exists'; END IF; END $$;"

if %errorlevel% neq 0 (
    echo ❌ Failed to create role
    exit /b 1
)
echo ✅ Role ready
echo.

REM Step 2: Create database
echo 💾 Step 2: Creating database "facebook_data"...
docker exec -it facebook-postgres psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname = 'facebook_data'" | findstr "1 row" >nul 2>&1

if %errorlevel% neq 0 (
    docker exec -it facebook-postgres psql -U postgres -c "CREATE DATABASE facebook_data OWNER fbadmin;"
    echo ✅ Database created
) else (
    echo ✅ Database already exists
)

docker exec -it facebook-postgres psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE facebook_data TO fbadmin;"
echo.

REM Step 3: Create tables from init.sql
echo 📜 Step 3: Creating tables...
docker exec -i facebook-postgres psql -U fbadmin -d facebook_data < database\init.sql

if %errorlevel% neq 0 (
    echo ⚠️  Some errors occurred, but continuing...
)
echo ✅ Tables created
echo.

REM Step 4: Test connection
echo 🔌 Step 4: Testing connection...
node test-db-connection.js

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ✅ DATABASE FIXED!
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 🎯 You can now run:
echo    node facebookkey.js
echo.
