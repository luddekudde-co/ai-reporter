-- CreateTable
CREATE TABLE "Digest" (
    "id" SERIAL NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekSummary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Digest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigestArticle" (
    "id" SERIAL NOT NULL,
    "digestId" INTEGER NOT NULL,
    "articleId" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "DigestArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Digest_weekStartDate_key" ON "Digest"("weekStartDate");

-- AddForeignKey
ALTER TABLE "DigestArticle" ADD CONSTRAINT "DigestArticle_digestId_fkey" FOREIGN KEY ("digestId") REFERENCES "Digest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigestArticle" ADD CONSTRAINT "DigestArticle_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
