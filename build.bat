@echo off
REM Скрипт сборки NestJS бэкенда в Bun бинарник

echo ========================================
echo Building NestJS Backend with Bun
echo ========================================

REM Генерируем Prisma Client
echo.
echo [1/4] Generating Prisma Client...
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Prisma generation failed
    exit /b 1
)

REM Собираем TypeScript в один файл
echo.
echo [2/4] Building TypeScript...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: TypeScript build failed
    exit /b 1
)

REM Компилируем в Bun бинарник (Windows)
echo.
echo [3/4] Compiling to Bun binary (Windows)...
bun build --compile --bytecode --minify --target=bun-windows-x64 ./dist/main.js --outfile ./bin/mes-backend-windows.exe
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Bun compilation failed
    exit /b 1
)

REM Копируем Prisma engine и schema
echo.
echo [4/4] Copying Prisma files...
if not exist "bin\prisma" mkdir bin\prisma
xcopy /Y /I "node_modules\.prisma\client\*.node" "bin\prisma\"
xcopy /Y /I "node_modules\.prisma\client\schema.prisma" "bin\prisma\"
xcopy /Y "prisma\schema.prisma" "bin\prisma\"

echo.
echo ========================================
echo Build completed successfully!
echo Binary: bin\mes-backend-windows.exe
echo Prisma: bin\prisma\
echo ========================================
