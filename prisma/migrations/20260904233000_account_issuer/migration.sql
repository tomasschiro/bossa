ALTER TABLE "accounts" ADD COLUMN "issuer" TEXT;
UPDATE "accounts" SET "issuer" = 'local:credential' WHERE "providerId" = 'credential';
ALTER TABLE "accounts" ALTER COLUMN "issuer" SET NOT NULL;
DROP INDEX "accounts_providerId_accountId_key";
CREATE UNIQUE INDEX "accounts_issuer_accountId_key" ON "accounts"("issuer", "accountId");
