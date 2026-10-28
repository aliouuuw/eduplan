CREATE UNIQUE INDEX `academic_years_current_uniq` ON `academic_years` (`school_id`) WHERE "academic_years"."is_current" = 1;--> statement-breakpoint
CREATE UNIQUE INDEX `appreciations_subject_uniq` ON `appreciations` (`school_id`,`student_id`,`term_id`,`subject_id`) WHERE "appreciations"."subject_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX `appreciations_general_uniq` ON `appreciations` (`school_id`,`student_id`,`term_id`) WHERE "appreciations"."subject_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_lesson_student_uniq` ON `attendance_records` (`school_id`,`timetable_id`,`date`,`student_id`);--> statement-breakpoint
CREATE INDEX `chapters_programme_idx` ON `chapters` (`school_id`,`programme_id`,`position`);--> statement-breakpoint
CREATE INDEX `classes_school_year_idx` ON `classes` (`school_id`,`academic_year`);--> statement-breakpoint
CREATE UNIQUE INDEX `grades_submission_uniq` ON `grades` (`school_id`,`submission_id`) WHERE "grades"."submission_id" is not null;--> statement-breakpoint
CREATE INDEX `grades_course_term_idx` ON `grades` (`school_id`,`term_id`,`class_id`,`subject_id`);--> statement-breakpoint
CREATE INDEX `grades_student_term_idx` ON `grades` (`school_id`,`student_id`,`term_id`,`subject_id`);--> statement-breakpoint
CREATE INDEX `invitations_school_created_idx` ON `invitations` (`school_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `invitations_pending_idx` ON `invitations` (`school_id`,`email`,`expires_at`) WHERE "invitations"."used_at" is null;--> statement-breakpoint
CREATE INDEX `notions_chapter_idx` ON `notions` (`school_id`,`chapter_id`,`position`);--> statement-breakpoint
CREATE INDEX `posts_teacher_class_idx` ON `posts` (`school_id`,`author_id`,`type`,`class_id`);--> statement-breakpoint
CREATE INDEX `enrollments_class_active_idx` ON `student_enrollments` (`school_id`,`class_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `enrollments_student_year_idx` ON `student_enrollments` (`school_id`,`student_id`,`academic_year`,`is_active`);--> statement-breakpoint
CREATE INDEX `flags_open_subject_idx` ON `student_flags` (`school_id`,`subject_id`,`student_id`) WHERE "student_flags"."dismissed_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_post_student_uniq` ON `submissions` (`school_id`,`post_id`,`student_id`);--> statement-breakpoint
CREATE INDEX `terms_year_idx` ON `terms` (`school_id`,`academic_year_id`);--> statement-breakpoint
CREATE INDEX `timetables_teacher_year_idx` ON `timetables` (`school_id`,`teacher_id`,`academic_year`,`status`);