CREATE TABLE `teacher_availability` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`school_id` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`is_recurring` integer DEFAULT true,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
