/*
  Warnings:

  - Added the required column `content` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `MessageReaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `MessageReaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MessageReactionType" AS ENUM ('LIKE', 'DISLIKE', 'LOVE');

-- AlterEnum
ALTER TYPE "FriendRequestStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MessageReaction" ADD COLUMN     "type" "MessageReactionType" NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;
