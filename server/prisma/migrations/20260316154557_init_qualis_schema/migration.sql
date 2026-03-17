-- CreateTable
CREATE TABLE "Journal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issn" TEXT NOT NULL,
    "title" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Classification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "estrato" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    CONSTRAINT "Classification_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Classification_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Journal_issn_key" ON "Journal"("issn");

-- CreateIndex
CREATE UNIQUE INDEX "Area_name_key" ON "Area"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Classification_journalId_areaId_key" ON "Classification"("journalId", "areaId");
