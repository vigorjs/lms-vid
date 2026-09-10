ALTER TABLE "Course"
ADD COLUMN "coverImageKey" TEXT,
ADD COLUMN "coverUpdatedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Course_coverImageKey_key" ON "Course"("coverImageKey");
