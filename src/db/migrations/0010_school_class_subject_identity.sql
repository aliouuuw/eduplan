ALTER TABLE `class_chapter_plans` ADD `subject_id` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `class_chapter_plans_uniq` ON `class_chapter_plans` (`school_id`,`class_id`,`subject_id`,`chapter_id`);--> statement-breakpoint
ALTER TABLE `notion_coverage` ADD `subject_id` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `notion_coverage_uniq` ON `notion_coverage` (`school_id`,`class_id`,`subject_id`,`notion_id`);--> statement-breakpoint
ALTER TABLE `schools` ADD `time_zone` text DEFAULT 'Africa/Dakar' NOT NULL;--> statement-breakpoint
ALTER TABLE `timetables` ADD `room` text;--> statement-breakpoint
ALTER TABLE `timetables` ADD `topic` text;--> statement-breakpoint
CREATE UNIQUE INDEX `timetables_slot_uniq` ON `timetables` (`school_id`,`class_id`,`time_slot_id`,`academic_year`);--> statement-breakpoint
CREATE UNIQUE INDEX `programmes_uniq` ON `programmes` (`school_id`,`subject_id`,`level_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `teacher_classes_uniq` ON `teacher_classes` (`school_id`,`teacher_id`,`class_id`,`subject_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `teacher_term_grade_targets_uniq` ON `teacher_term_grade_targets` (`school_id`,`teacher_id`,`term_id`);