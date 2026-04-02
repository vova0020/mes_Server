#!/bin/bash
# Скрипт сборки NestJS бэкенда в Bun бинарник для Linux

echo "========================================"
echo "Building NestJS Backend with Bun (Linux)"
echo "========================================"

# Генерируем Prisma Client
echo ""
echo "[1/4] Generating Prisma Client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "ERROR: Prisma generation failed"
    exit 1
fi

# Собираем TypeScript в один файл
echo ""
echo "[2/4] Building TypeScript..."
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: TypeScript build failed"
    exit 1
fi

# Компилируем в Bun бинарник (Linux)
echo ""
echo "[3/4] Compiling to Bun binary (Linux)..."
bun build --compile --bytecode --minify --target=bun-linux-x64 ./dist/main.js --outfile ./bin/mes-backend-linux
if [ $? -ne 0 ]; then
    echo "ERROR: Bun compilation failed"
    exit 1
fi

# Копируем Prisma engine и schema
echo ""
echo "[4/4] Copying Prisma files..."
mkdir -p bin/prisma
cp node_modules/.prisma/client/*.node bin/prisma/ 2>/dev/null || true
cp node_modules/.prisma/client/schema.prisma bin/prisma/
cp prisma/schema.prisma bin/prisma/

chmod +x bin/mes-backend-linux

echo ""
echo "========================================"
echo "Build completed successfully!"
echo "Binary: bin/mes-backend-linux"
echo "Prisma: bin/prisma/"
echo "========================================"
