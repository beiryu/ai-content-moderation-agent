-- CreateTable
CREATE TABLE "user_configs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "chatModel" TEXT,
    "chatTemperature" DOUBLE PRECISION,
    "realtimeModel" TEXT,
    "realtimeVoice" TEXT,
    "deepgramModel" TEXT,
    "deepgramLanguage" TEXT,
    "silenceThresholdMs" INTEGER,
    "utteranceEndMs" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_configs_userId_key" ON "user_configs"("userId");

-- AddForeignKey
ALTER TABLE "user_configs" ADD CONSTRAINT "user_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
