@echo off
echo ========================================
echo Clean Rebuild Backend with Prisma 6.19.2
echo ========================================
echo.

echo [1/5] Removing old node_modules...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f /q package-lock.json
echo OK

echo [2/5] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)
echo OK

echo [3/5] Generating Prisma Client...
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: prisma generate failed
    pause
    exit /b 1
)
echo OK

echo [4/5] Building NestJS...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: nest build failed
    pause
    exit /b 1
)
echo OK

echo [5/5] Compiling with Bun...
bun build --compile --bytecode --minify --target=bun-windows-x64 ./dist/main.js --outfile ./mes-backend-windows.exe
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: bun build failed
    pause
    exit /b 1
)
echo OK

echo.
echo ========================================
echo SUCCESS!
echo ========================================
echo.
echo Backend binary created: mes-backend-windows.exe
echo Now copy it to clientHub\becend\
echo.
pause
