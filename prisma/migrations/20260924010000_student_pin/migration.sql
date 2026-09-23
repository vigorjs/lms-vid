-- Existing accounts use the agreed shared PIN. A new registration has no PIN until setup.
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
UPDATE "User"
SET "passwordHash" = '$argon2id$v=19$m=19456,t=2,p=1$Qz/OdbQixZ7zmvG2eMyFsQ$hARmL5MopVmtsfvFKZyiO7dmH/ODje0t09skKAgy1qY',
    "mustChangePassword" = false,
    "authVersion" = "authVersion" + 1,
    "failedLoginCount" = 0,
    "lockedUntil" = NULL;
