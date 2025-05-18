-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "allowComments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "galleryStyle" TEXT NOT NULL DEFAULT 'scrapbook',
ADD COLUMN     "maxAttendees" INTEGER,
ADD COLUMN     "maxPhotosPerAttendee" INTEGER;
