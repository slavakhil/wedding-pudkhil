CREATE TYPE "GuestType" AS ENUM ('single', 'couple', 'family');
CREATE TYPE "ContentType" AS ENUM ('text', 'json', 'image');

CREATE TABLE "Invitation" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "guestType" "GuestType" NOT NULL DEFAULT 'single',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Guest" (
  "id" TEXT NOT NULL,
  "invitationId" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "foodPreferences" TEXT[],
  "alcoholPreferences" TEXT[],
  "hasChild" BOOLEAN NOT NULL,
  "comment" TEXT,
  "moneyGiftEnabled" BOOLEAN NOT NULL DEFAULT false,
  "moneyGiftAmount" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteContent" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "type" "ContentType" NOT NULL DEFAULT 'text',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "alt" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invitation_slug_key" ON "Invitation"("slug");
CREATE UNIQUE INDEX "Guest_invitationId_phone_key" ON "Guest"("invitationId", "phone");
CREATE UNIQUE INDEX "SiteContent_key_key" ON "SiteContent"("key");

ALTER TABLE "Guest"
  ADD CONSTRAINT "Guest_invitationId_fkey"
  FOREIGN KEY ("invitationId")
  REFERENCES "Invitation"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
