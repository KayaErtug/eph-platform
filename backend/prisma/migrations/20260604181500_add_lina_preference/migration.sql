CREATE TABLE IF NOT EXISTS "LinaPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "voiceEnabled" BOOLEAN NOT NULL DEFAULT false,
  "dashboardVoiceSummaryEnabled" BOOLEAN NOT NULL DEFAULT false,
  "crmVoiceReminderEnabled" BOOLEAN NOT NULL DEFAULT false,
  "networkVoiceSummaryEnabled" BOOLEAN NOT NULL DEFAULT false,
  "poolVoiceSummaryEnabled" BOOLEAN NOT NULL DEFAULT false,
  "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT true,
  "quietHoursStart" TEXT NOT NULL DEFAULT '22:00',
  "quietHoursEnd" TEXT NOT NULL DEFAULT '08:00',
  "urgentVoiceEnabled" BOOLEAN NOT NULL DEFAULT false,
  "summaryStyle" TEXT NOT NULL DEFAULT 'normal',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LinaPreference_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LinaPreference_userId_key" UNIQUE ("userId"),
  CONSTRAINT "LinaPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "LinaPreference_userId_idx" ON "LinaPreference"("userId");