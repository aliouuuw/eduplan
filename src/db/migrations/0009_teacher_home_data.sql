CREATE TABLE `teacher_term_grade_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	`term_id` text NOT NULL,
	`expected_entries` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `class_chapter_plans` ADD `planned_week_start` integer;--> statement-breakpoint
ALTER TABLE `class_chapter_plans` ADD `planned_week_end` integer;--> statement-breakpoint
ALTER TABLE `posts` ADD `assignment_format` text;--> statement-breakpoint
ALTER TABLE `student_flags` ADD `rule_kind` text;--> statement-breakpoint
ALTER TABLE `time_slots` ADD `room` text;--> statement-breakpoint
ALTER TABLE `time_slots` ADD `topic` text;