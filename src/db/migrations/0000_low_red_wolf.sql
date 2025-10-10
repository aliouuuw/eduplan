CREATE TABLE `academic_levels` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`level_id` text NOT NULL,
	`name` text NOT NULL,
	`academic_year` text NOT NULL,
	`capacity` integer DEFAULT 30,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `parent_students` (
	`parent_id` text NOT NULL,
	`student_id` text NOT NULL,
	`school_id` text NOT NULL,
	`relationship` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`parent_id`, `student_id`)
);
--> statement-breakpoint
CREATE TABLE `schools` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`phone` text,
	`email` text,
	`logo` text,
	`is_active` integer DEFAULT true,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `student_enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`class_id` text NOT NULL,
	`school_id` text NOT NULL,
	`academic_year` text NOT NULL,
	`enrollment_date` integer NOT NULL,
	`is_active` integer DEFAULT true
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teacher_classes` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`class_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`school_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teacher_subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`school_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `time_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`name` text,
	`is_break` integer DEFAULT false,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `timetables` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`class_id` text NOT NULL,
	`subject_id` text,
	`teacher_id` text,
	`time_slot_id` text NOT NULL,
	`academic_year` text NOT NULL,
	`status` text DEFAULT 'draft',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`school_id` text,
	`is_active` integer DEFAULT true,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);