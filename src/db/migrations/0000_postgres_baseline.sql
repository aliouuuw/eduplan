CREATE TABLE "academic_levels" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academic_years" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"is_current" boolean DEFAULT false,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appreciations" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"subject_id" text,
	"term_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"post_id" text,
	"submission_id" text,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"timetable_id" text NOT NULL,
	"date" date NOT NULL,
	"status" text NOT NULL,
	"minutes_late" integer,
	"justification" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"programme_id" text NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_chapter_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"class_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"chapter_id" text NOT NULL,
	"position" integer NOT NULL,
	"planned_week" integer,
	"planned_week_start" integer,
	"planned_week_end" integer,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"level_id" text NOT NULL,
	"time_slot_template_id" text,
	"name" text NOT NULL,
	"academic_year" text NOT NULL,
	"academic_year_id" text,
	"capacity" integer DEFAULT 30,
	"head_teacher_id" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flag_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"kind" text NOT NULL,
	"threshold" double precision NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"class_id" text NOT NULL,
	"term_id" text NOT NULL,
	"submission_id" text,
	"value" double precision NOT NULL,
	"coefficient" double precision NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by" text NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "message_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notion_coverage" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"class_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"notion_id" text NOT NULL,
	"post_id" text,
	"covered_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notions" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"chapter_id" text NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parent_students" (
	"parent_id" text NOT NULL,
	"student_id" text NOT NULL,
	"school_id" text NOT NULL,
	"relationship" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "parent_students_parent_id_student_id_pk" PRIMARY KEY("parent_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "password_reset_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"user_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by" text,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by" text NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "password_resets_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"class_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"topic_id" text,
	"author_id" text NOT NULL,
	"notion_id" text,
	"type" text NOT NULL,
	"assignment_format" text,
	"title" text NOT NULL,
	"body" text,
	"due_at" timestamp with time zone,
	"max_grade" double precision,
	"coefficient" double precision DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programmes" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"level_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "remarks" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"author_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"body" text NOT NULL,
	"visibility" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_settings" (
	"school_id" text PRIMARY KEY NOT NULL,
	"show_flags_to_students" boolean DEFAULT false NOT NULL,
	"show_flags_to_parents" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"school_code" text NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"logo" text,
	"time_zone" text DEFAULT 'Africa/Dakar' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "schools_school_code_unique" UNIQUE("school_code")
);
--> statement-breakpoint
CREATE TABLE "student_enrollments" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"class_id" text NOT NULL,
	"school_id" text NOT NULL,
	"academic_year" text NOT NULL,
	"enrollment_date" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "student_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"source" text NOT NULL,
	"rule_kind" text,
	"reason" text NOT NULL,
	"dismissed_by" text,
	"dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"description" text,
	"weekly_hours" integer DEFAULT 0,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"post_id" text NOT NULL,
	"student_id" text NOT NULL,
	"status" text NOT NULL,
	"body" text,
	"submitted_at" timestamp with time zone,
	"returned_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_availability" (
	"id" text PRIMARY KEY NOT NULL,
	"teacher_id" text NOT NULL,
	"school_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"is_recurring" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_classes" (
	"id" text PRIMARY KEY NOT NULL,
	"teacher_id" text NOT NULL,
	"class_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"school_id" text NOT NULL,
	"weekly_hours" integer DEFAULT 0,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_subjects" (
	"id" text PRIMARY KEY NOT NULL,
	"teacher_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"school_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_term_grade_targets" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"term_id" text NOT NULL,
	"expected_entries" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"academic_year_id" text NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_slot_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"template_id" text,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"name" text,
	"room" text,
	"topic" text,
	"is_break" boolean DEFAULT false,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timetables" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"class_id" text NOT NULL,
	"subject_id" text,
	"teacher_id" text,
	"time_slot_id" text NOT NULL,
	"academic_year" text NOT NULL,
	"room" text,
	"topic" text,
	"status" text DEFAULT 'draft',
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"class_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"school_id" text,
	"is_active" boolean DEFAULT true,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "academic_years_current_uniq" ON "academic_years" USING btree ("school_id") WHERE "academic_years"."is_current" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "appreciations_subject_uniq" ON "appreciations" USING btree ("school_id","student_id","term_id","subject_id") WHERE "appreciations"."subject_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "appreciations_general_uniq" ON "appreciations" USING btree ("school_id","student_id","term_id") WHERE "appreciations"."subject_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_lesson_student_uniq" ON "attendance_records" USING btree ("school_id","timetable_id","date","student_id");--> statement-breakpoint
CREATE INDEX "chapters_programme_idx" ON "chapters" USING btree ("school_id","programme_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "class_chapter_plans_uniq" ON "class_chapter_plans" USING btree ("school_id","class_id","subject_id","chapter_id");--> statement-breakpoint
CREATE INDEX "classes_school_year_idx" ON "classes" USING btree ("school_id","academic_year");--> statement-breakpoint
CREATE INDEX "classes_school_year_id_idx" ON "classes" USING btree ("school_id","academic_year_id");--> statement-breakpoint
CREATE UNIQUE INDEX "grades_submission_uniq" ON "grades" USING btree ("school_id","submission_id") WHERE "grades"."submission_id" is not null;--> statement-breakpoint
CREATE INDEX "grades_course_term_idx" ON "grades" USING btree ("school_id","term_id","class_id","subject_id");--> statement-breakpoint
CREATE INDEX "grades_student_term_idx" ON "grades" USING btree ("school_id","student_id","term_id","subject_id");--> statement-breakpoint
CREATE INDEX "invitations_school_created_idx" ON "invitations" USING btree ("school_id","created_at","id");--> statement-breakpoint
CREATE INDEX "invitations_pending_idx" ON "invitations" USING btree ("school_id","email","expires_at") WHERE "invitations"."used_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "notion_coverage_uniq" ON "notion_coverage" USING btree ("school_id","class_id","subject_id","notion_id");--> statement-breakpoint
CREATE INDEX "notions_chapter_idx" ON "notions" USING btree ("school_id","chapter_id","position");--> statement-breakpoint
CREATE INDEX "posts_teacher_class_idx" ON "posts" USING btree ("school_id","author_id","type","class_id");--> statement-breakpoint
CREATE UNIQUE INDEX "programmes_uniq" ON "programmes" USING btree ("school_id","subject_id","level_id");--> statement-breakpoint
CREATE INDEX "enrollments_class_active_idx" ON "student_enrollments" USING btree ("school_id","class_id","is_active");--> statement-breakpoint
CREATE INDEX "enrollments_student_year_idx" ON "student_enrollments" USING btree ("school_id","student_id","academic_year","is_active");--> statement-breakpoint
CREATE INDEX "flags_open_subject_idx" ON "student_flags" USING btree ("school_id","subject_id","student_id") WHERE "student_flags"."dismissed_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "submissions_post_student_uniq" ON "submissions" USING btree ("school_id","post_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_classes_uniq" ON "teacher_classes" USING btree ("school_id","teacher_id","class_id","subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teacher_term_grade_targets_uniq" ON "teacher_term_grade_targets" USING btree ("school_id","teacher_id","term_id");--> statement-breakpoint
CREATE INDEX "terms_year_idx" ON "terms" USING btree ("school_id","academic_year_id");--> statement-breakpoint
CREATE UNIQUE INDEX "timetables_slot_uniq" ON "timetables" USING btree ("school_id","class_id","time_slot_id","academic_year");--> statement-breakpoint
CREATE INDEX "timetables_teacher_year_idx" ON "timetables" USING btree ("school_id","teacher_id","academic_year","status");