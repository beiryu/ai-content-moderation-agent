-- Create SessionMemory table for short-term memory
CREATE TABLE "session_memories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_memories_pkey" PRIMARY KEY ("id")
);

-- Create LongTermMemory table
CREATE TABLE "long_term_memories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" TEXT,
    "importance" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "long_term_memories_pkey" PRIMARY KEY ("id")
);

-- Create RetrievalLog table for analytics
CREATE TABLE "retrieval_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT,
    "query" TEXT NOT NULL,
    "result_count" INTEGER NOT NULL,
    "top_score" DOUBLE PRECISION NOT NULL,
    "avg_score" DOUBLE PRECISION NOT NULL,
    "results" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retrieval_logs_pkey" PRIMARY KEY ("id")
);

-- Add indexes for performance
CREATE INDEX "session_memories_user_session_idx" ON "session_memories"("user_id", "session_id");
CREATE INDEX "long_term_memories_user_category_idx" ON "long_term_memories"("user_id", "category");
CREATE INDEX "retrieval_logs_user_idx" ON "retrieval_logs"("user_id");

-- Add foreign keys
ALTER TABLE "session_memories" ADD CONSTRAINT "session_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "long_term_memories" ADD CONSTRAINT "long_term_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "retrieval_logs" ADD CONSTRAINT "retrieval_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;