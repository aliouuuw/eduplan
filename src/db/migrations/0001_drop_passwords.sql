DROP TABLE "password_reset_requests" CASCADE;--> statement-breakpoint
DROP TABLE "password_resets" CASCADE;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password";