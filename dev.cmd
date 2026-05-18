@echo off
setlocal

echo =======================================================
echo PrintSlot Dev Launcher (Windows)
echo =======================================================

echo [1/3] Checking dependencies...
if not exist node_modules (
    echo Installing packages...
    npm install
) else (
    echo node_modules found (skip install)
)

echo.
echo [2/3] Generating Prisma client...
cd apps\api
call npx prisma generate
cd ..\..

echo.
echo [3/3] Starting API and Mobile apps...
echo.
echo Press Ctrl+C to stop both apps.
echo.

REM Using Turborepo which is already configured in package.json
call npm run dev
