-- CreateEnum
CREATE TYPE "public"."AnomalyCategory" AS ENUM ('PERFORMANCE', 'SECURITY', 'AVAILABILITY', 'BUSINESS', 'SYSTEM');

-- CreateEnum
CREATE TYPE "public"."AnomalySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."CorrectiveActionType" AS ENUM ('IMMEDIATE', 'SHORT_TERM', 'LONG_TERM', 'PREVENTIVE');

-- CreateEnum
CREATE TYPE "public"."ActionUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."ActionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."Anomaly" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "category" "public"."AnomalyCategory" NOT NULL,
    "severity" "public"."AnomalySeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "metrics" JSONB NOT NULL,
    "recommendations" TEXT[],
    "relatedRequestIds" TEXT[],
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anomaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CorrectiveAction" (
    "id" TEXT NOT NULL,
    "anomalyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "public"."CorrectiveActionType" NOT NULL,
    "urgency" "public"."ActionUrgency" NOT NULL,
    "status" "public"."ActionStatus" NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT,
    "estimatedTime" TEXT,
    "actualTime" TEXT,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrectiveAction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_anomalyId_fkey" FOREIGN KEY ("anomalyId") REFERENCES "public"."Anomaly"("id") ON DELETE CASCADE ON UPDATE CASCADE;
