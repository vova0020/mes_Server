@echo off
REM Скрипт сборки и развертывания бэкенда

echo ========================================
echo Building and Deploying Backend
echo ========================================

REM Генерируем Prisma Client с новыми настройками
echo.
echo [1/4] Generating Prisma Client...
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Prisma generation failed
    pause
    exit /b 1
)

REM Собираем TypeScript
echo.
echo [2/4] Building TypeScript...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: TypeScript build failed
    pause
    exit /b 1
)

REM Компилируем в Bun бинарник
echo.
echo [3/3] Compiling to Bun binary...
call bun build --compile --bytecode --minify --target=bun-windows-x64 --external @nestjs/microservices --external class-transformer/storage ./dist/src/main.js --outfile ./mes-backend-windows.exe
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Bun compilation failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build completed successfully!
echo Binary: mes-backend-windows.exe
echo ========================================
echo.
echo You can now copy the binary to clientHub manually
pause
