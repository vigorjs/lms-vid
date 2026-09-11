CREATE TYPE "CourseVisibility" AS ENUM ('PUBLIC', 'ASSIGNED');

ALTER TABLE "Course"
ADD COLUMN "visibility" "CourseVisibility" NOT NULL DEFAULT 'PUBLIC';

CREATE TABLE "CourseAssignment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseAssignment_courseId_studentId_key"
ON "CourseAssignment"("courseId", "studentId");

CREATE INDEX "CourseAssignment_studentId_courseId_idx"
ON "CourseAssignment"("studentId", "courseId");

ALTER TABLE "CourseAssignment"
ADD CONSTRAINT "CourseAssignment_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CourseAssignment"
ADD CONSTRAINT "CourseAssignment_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
