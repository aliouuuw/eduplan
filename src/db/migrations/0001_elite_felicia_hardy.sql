CREATE TABLE `invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_by` text NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_token_unique` ON `invitations` (`token`);--> statement-breakpoint
ALTER TABLE `schools` ADD `school_code` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `schools_school_code_unique` ON `schools` (`school_code`);