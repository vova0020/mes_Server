-- AlterTable
ALTER TABLE "machines" ADD COLUMN "machine_code" TEXT;

-- CreateTable
CREATE TABLE "operator_machine_bindings" (
    "binding_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "machine_id" INTEGER NOT NULL,
    "operator_number" INTEGER NOT NULL,
    "bound_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unbound_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "operator_machine_bindings_pkey" PRIMARY KEY ("binding_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "machines_machine_code_key" ON "machines"("machine_code");

-- CreateIndex
CREATE INDEX "operator_machine_bindings_user_id_idx" ON "operator_machine_bindings"("user_id");

-- CreateIndex
CREATE INDEX "operator_machine_bindings_machine_id_is_active_idx" ON "operator_machine_bindings"("machine_id", "is_active");

-- CreateIndex
CREATE INDEX "operator_machine_bindings_machine_id_operator_number_is_act_idx" ON "operator_machine_bindings"("machine_id", "operator_number", "is_active");

-- AddForeignKey
ALTER TABLE "operator_machine_bindings" ADD CONSTRAINT "operator_machine_bindings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_machine_bindings" ADD CONSTRAINT "operator_machine_bindings_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("machine_id") ON DELETE CASCADE ON UPDATE CASCADE;
