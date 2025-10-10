CREATE TABLE `password_reset_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_by` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
