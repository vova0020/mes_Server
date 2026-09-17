-- CreateTable: packing_task_operators
-- Таблица для связи задач упаковки с операторами (many-to-many)

CREATE TABLE IF NOT EXISTS "packing_task_operators" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "operator_number" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packing_task_operators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "packing_task_operators_task_id_user_id_key" ON "packing_task_operators"("task_id", "user_id");

-- CreateIndex
CREATE INDEX "packing_task_operators_task_id_idx" ON "packing_task_operators"("task_id");

-- CreateIndex
CREATE INDEX "packing_task_operators_user_id_idx" ON "packing_task_operators"("user_id");

-- AddForeignKey
ALTER TABLE "packing_task_operators" ADD CONSTRAINT "packing_task_operators_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "packing_tasks"("task_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packing_task_operators" ADD CONSTRAINT "packing_task_operators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
