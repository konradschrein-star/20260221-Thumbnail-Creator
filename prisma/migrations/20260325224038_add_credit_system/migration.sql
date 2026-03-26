-- AlterTable
ALTER TABLE "users" ADD COLUMN "credits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "total_credits_granted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "total_credits_consumed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "password_hash_algorithm" TEXT NOT NULL DEFAULT 'bcrypt';

-- AlterTable
ALTER TABLE "generation_jobs" ADD COLUMN "credits_deducted" INTEGER;

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "related_job_id" TEXT,
    "related_batch_id" TEXT,
    "admin_user_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_transactions_user_id_idx" ON "credit_transactions"("user_id");

-- CreateIndex
CREATE INDEX "credit_transactions_created_at_idx" ON "credit_transactions"("created_at");

-- CreateIndex
CREATE INDEX "credit_transactions_transaction_type_idx" ON "credit_transactions"("transaction_type");

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
