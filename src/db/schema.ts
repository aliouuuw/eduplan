import { pgTable, text, integer, doublePrecision, boolean, timestamp, date, primaryKey, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Users table with role hierarchy: superadmin > admin > teacher/parent > student
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  authUserId: text('auth_user_id').unique(), // the Neon Auth account (D49); null = profile without a login
  name: text('name').notNull(),
  role: text('role', { enum: ['superadmin', 'admin', 'teacher', 'parent', 'student'] }).notNull(),
  schoolId: text('school_id'), // null for superadmin, required for others
  isActive: boolean('is_active').default(true),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // null = not deleted, timestamp = soft deleted
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

// Schools table - managed by superadmin
export const schools = pgTable('schools', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  schoolCode: text('school_code').notNull().unique(), // e.g., "DAKAR-HS-2025"
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  logo: text('logo'), // URL to logo image
  timeZone: text('time_zone').notNull().default('Africa/Dakar'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

// Invitations table - for invitation-based registration
export const invitations = pgTable('invitations', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  email: text('email').notNull(),
  role: text('role', { enum: ['admin', 'teacher', 'parent', 'student'] }).notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdBy: text('created_by').notNull(), // userId who created the invitation
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
}, (table) => ({
  schoolCreated: index('invitations_school_created_idx').on(table.schoolId, table.createdAt, table.id),
  pending: index('invitations_pending_idx').on(table.schoolId, table.email, table.expiresAt).where(sql`${table.usedAt} is null`),
}));

// Academic levels (e.g., Primary, Secondary, etc.)
export const academicLevels = pgTable('academic_levels', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  name: text('name').notNull(), // e.g., "Primary", "Secondary"
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

// Classes/Grades within a school
export const classes = pgTable('classes', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  levelId: text('level_id').notNull(),
  timeSlotTemplateId: text('time_slot_template_id'), // Links to time slot template
  name: text('name').notNull(), // e.g., "6ème A", "CM2 B"
  academicYear: text('academic_year').notNull(), // display label; the year key is academicYearId
  academicYearId: text('academic_year_id').references(() => academicYears.id), // one class row per year (D40)
  capacity: integer('capacity').default(30),
  headTeacherId: text('head_teacher_id'), // professeur principal (D37)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => ({
  schoolYear: index('classes_school_year_idx').on(table.schoolId, table.academicYear),
  schoolYearId: index('classes_school_year_id_idx').on(table.schoolId, table.academicYearId),
}));

// Subjects taught in the school
export const subjects = pgTable('subjects', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  name: text('name').notNull(), // e.g., "Mathematics", "French"
  code: text('code'), // e.g., "MATH", "FR"
  description: text('description'),
  weeklyHours: integer('weekly_hours').default(0), // Hours per week for auto-scheduling
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

// Teachers and their subject assignments
export const teacherSubjects = pgTable('teacher_subjects', {
  id: text('id').primaryKey(),
  teacherId: text('teacher_id').notNull(),
  subjectId: text('subject_id').notNull(),
  schoolId: text('school_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

// Teacher-Class assignments (which classes a teacher teaches)
export const teacherClasses = pgTable('teacher_classes', {
  id: text('id').primaryKey(),
  teacherId: text('teacher_id').notNull(),
  classId: text('class_id').notNull(),
  subjectId: text('subject_id').notNull(),
  schoolId: text('school_id').notNull(),
  weeklyHours: integer('weekly_hours').default(0), // Hours per week for this specific class-subject assignment
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
}, (table) => ({
  uniq: uniqueIndex('teacher_classes_uniq').on(table.schoolId, table.teacherId, table.classId, table.subjectId),
}));

// Teacher availability (when teachers are available to teach)
export const teacherAvailability = pgTable('teacher_availability', {
  id: text('id').primaryKey(),
  teacherId: text('teacher_id').notNull(),
  schoolId: text('school_id').notNull(),
  dayOfWeek: integer('day_of_week').notNull(), // 1-7 (Monday-Sunday)
  startTime: text('start_time').notNull(), // HH:MM format
  endTime: text('end_time').notNull(), // HH:MM format
  isRecurring: boolean('is_recurring').default(true), // true = every week
  notes: text('notes'), // e.g., "Prefer morning classes", "Available for substitute"
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

// Student enrollments in classes
export const studentEnrollments = pgTable('student_enrollments', {
  id: text('id').primaryKey(),
  studentId: text('student_id').notNull(),
  classId: text('class_id').notNull(),
  schoolId: text('school_id').notNull(),
  academicYear: text('academic_year').notNull(),
  enrollmentDate: timestamp('enrollment_date', { withTimezone: true }).notNull(),
  isActive: boolean('is_active').default(true),
}, (table) => ({
  classActive: index('enrollments_class_active_idx').on(table.schoolId, table.classId, table.isActive),
  studentYear: index('enrollments_student_year_idx').on(table.schoolId, table.studentId, table.academicYear, table.isActive),
}));

// Parent-Student relationships
export const parentStudents = pgTable('parent_students', {
  parentId: text('parent_id').notNull(),
  studentId: text('student_id').notNull(),
  schoolId: text('school_id').notNull(),
  relationship: text('relationship').notNull(), // e.g., "father", "mother", "guardian"
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.parentId, table.studentId] }),
}));

// Time slot templates (e.g., "Primary Schedule", "Secondary Schedule")
export const timeSlotTemplates = pgTable('time_slot_templates', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  name: text('name').notNull(), // e.g., "Primary Schedule", "Secondary Full Day"
  description: text('description'), // e.g., "For classes CP through CM2"
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  createdBy: text('created_by').notNull(), // User who created it
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

// Time slots for timetables
export const timeSlots = pgTable('time_slots', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  templateId: text('template_id'), // Links to time slot template
  dayOfWeek: integer('day_of_week').notNull(), // 1-7 (Monday-Sunday)
  startTime: text('start_time').notNull(), // HH:MM format
  endTime: text('end_time').notNull(), // HH:MM format
  name: text('name'), // legacy label; prefer room + topic
  room: text('room'),
  topic: text('topic'),
  isBreak: boolean('is_break').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

// Timetable entries
export const timetables = pgTable('timetables', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  classId: text('class_id').notNull(),
  subjectId: text('subject_id'),
  teacherId: text('teacher_id'),
  timeSlotId: text('time_slot_id').notNull(),
  academicYear: text('academic_year').notNull(),
  room: text('room'),
  topic: text('topic'),
  status: text('status', { enum: ['draft', 'active'] }).default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => ({
  uniq: uniqueIndex('timetables_slot_uniq').on(table.schoolId, table.classId, table.timeSlotId, table.academicYear),
  teacherYear: index('timetables_teacher_year_idx').on(table.schoolId, table.teacherId, table.academicYear, table.status),
}));

// Teaching loop (MVP_REWORK_PLAN.md §4). Rubrics stay out (D5).
// No SQL foreign keys: same pattern as teacher_classes (orphans must not count).

export const academicYears = pgTable('academic_years', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  name: text('name').notNull(),
  startsOn: date('starts_on').notNull(),
  endsOn: date('ends_on').notNull(),
  isCurrent: boolean('is_current').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => ({
  current: uniqueIndex('academic_years_current_uniq').on(table.schoolId).where(sql`${table.isCurrent} = true`),
}));

export const terms = pgTable('terms', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  academicYearId: text('academic_year_id').notNull(),
  name: text('name').notNull(),
  position: integer('position').notNull(),
  startsOn: date('starts_on').notNull(),
  endsOn: date('ends_on').notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }), // set by the admin after the conseil; closed = read-only (D41)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => ({
  year: index('terms_year_idx').on(table.schoolId, table.academicYearId),
}));

export const topics = pgTable('topics', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  classId: text('class_id').notNull(),
  subjectId: text('subject_id').notNull(),
  title: text('title').notNull(),
  position: integer('position').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const posts = pgTable('posts', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  classId: text('class_id').notNull(),
  subjectId: text('subject_id').notNull(),
  topicId: text('topic_id'),
  authorId: text('author_id').notNull(),
  notionId: text('notion_id'),
  type: text('type', { enum: ['lesson', 'material', 'assignment'] }).notNull(),
  /** homework = digital submission; paper = contrôle saisi en classe */
  assignmentFormat: text('assignment_format', { enum: ['homework', 'paper'] }),
  title: text('title').notNull(),
  body: text('body'),
  dueAt: timestamp('due_at', { withTimezone: true }),
  maxGrade: doublePrecision('max_grade'),
  coefficient: doublePrecision('coefficient').notNull().default(1), // weight of this work's grade in the trimestre average
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => ({
  teacherClass: index('posts_teacher_class_idx').on(table.schoolId, table.authorId, table.type, table.classId),
}));

export const attachments = pgTable('attachments', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  postId: text('post_id'),
  submissionId: text('submission_id'),
  storageKey: text('storage_key').notNull(),
  fileName: text('file_name').notNull(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const submissions = pgTable('submissions', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  postId: text('post_id').notNull(),
  studentId: text('student_id').notNull(),
  status: text('status', { enum: ['assigned', 'submitted', 'late', 'returned'] }).notNull(),
  body: text('body'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  returnedAt: timestamp('returned_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => ({
  uniq: uniqueIndex('submissions_post_student_uniq').on(table.schoolId, table.postId, table.studentId),
}));

export const grades = pgTable('grades', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  studentId: text('student_id').notNull(),
  subjectId: text('subject_id').notNull(),
  classId: text('class_id').notNull(),
  termId: text('term_id').notNull(),
  submissionId: text('submission_id'),
  value: doublePrecision('value').notNull(),
  coefficient: doublePrecision('coefficient').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => ({
  submission: uniqueIndex('grades_submission_uniq').on(table.schoolId, table.submissionId).where(sql`${table.submissionId} is not null`),
  courseTerm: index('grades_course_term_idx').on(table.schoolId, table.termId, table.classId, table.subjectId),
  studentTerm: index('grades_student_term_idx').on(table.schoolId, table.studentId, table.termId, table.subjectId),
}));

export const attendanceRecords = pgTable('attendance_records', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  studentId: text('student_id').notNull(),
  timetableId: text('timetable_id').notNull(),
  date: date('date').notNull(),
  status: text('status', { enum: ['present', 'absent', 'late'] }).notNull(),
  minutesLate: integer('minutes_late'),
  justification: text('justification'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => ({
  uniq: uniqueIndex('attendance_lesson_student_uniq').on(table.schoolId, table.timetableId, table.date, table.studentId),
}));

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  userId: text('user_id').notNull(),
  kind: text('kind').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const programmes = pgTable('programmes', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  subjectId: text('subject_id').notNull(),
  levelId: text('level_id').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => ({
  uniq: uniqueIndex('programmes_uniq').on(table.schoolId, table.subjectId, table.levelId),
}));

export const chapters = pgTable('chapters', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  programmeId: text('programme_id').notNull(),
  title: text('title').notNull(),
  position: integer('position').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => ({
  programme: index('chapters_programme_idx').on(table.schoolId, table.programmeId, table.position),
}));

export const notions = pgTable('notions', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  chapterId: text('chapter_id').notNull(),
  title: text('title').notNull(),
  position: integer('position').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => ({
  chapter: index('notions_chapter_idx').on(table.schoolId, table.chapterId, table.position),
}));

export const classChapterPlans = pgTable('class_chapter_plans', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  classId: text('class_id').notNull(),
  subjectId: text('subject_id').notNull(),
  chapterId: text('chapter_id').notNull(),
  position: integer('position').notNull(),
  plannedWeek: integer('planned_week'),
  plannedWeekStart: integer('planned_week_start'),
  plannedWeekEnd: integer('planned_week_end'),
  status: text('status', { enum: ['upcoming', 'current', 'done'] }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => ({
  uniq: uniqueIndex('class_chapter_plans_uniq').on(table.schoolId, table.classId, table.subjectId, table.chapterId),
}));

export const notionCoverage = pgTable('notion_coverage', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  classId: text('class_id').notNull(),
  subjectId: text('subject_id').notNull(),
  notionId: text('notion_id').notNull(),
  postId: text('post_id'),
  coveredAt: timestamp('covered_at', { withTimezone: true }).notNull(),
}, (table) => ({
  uniq: uniqueIndex('notion_coverage_uniq').on(table.schoolId, table.classId, table.subjectId, table.notionId),
}));

export const remarks = pgTable('remarks', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  studentId: text('student_id').notNull(),
  authorId: text('author_id').notNull(),
  subjectId: text('subject_id').notNull(),
  body: text('body').notNull(),
  visibility: text('visibility', { enum: ['private', 'family'] }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const teacherTermGradeTargets = pgTable('teacher_term_grade_targets', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  teacherId: text('teacher_id').notNull(),
  termId: text('term_id').notNull(),
  expectedEntries: integer('expected_entries').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => ({
  uniq: uniqueIndex('teacher_term_grade_targets_uniq').on(table.schoolId, table.teacherId, table.termId),
}));

export const studentFlags = pgTable('student_flags', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  studentId: text('student_id').notNull(),
  subjectId: text('subject_id').notNull(),
  source: text('source', { enum: ['rule', 'teacher'] }).notNull(),
  ruleKind: text('rule_kind', { enum: ['average', 'absences', 'missing'] }),
  reason: text('reason').notNull(),
  dismissedBy: text('dismissed_by'),
  dismissedAt: timestamp('dismissed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
}, (table) => ({
  openSubject: index('flags_open_subject_idx').on(table.schoolId, table.subjectId, table.studentId).where(sql`${table.dismissedAt} is null`),
}));

export const flagRules = pgTable('flag_rules', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  kind: text('kind', { enum: ['average', 'absences', 'missing'] }).notNull(),
  threshold: doublePrecision('threshold').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const schoolSettings = pgTable('school_settings', {
  schoolId: text('school_id').primaryKey(),
  showFlagsToStudents: boolean('show_flags_to_students').default(false).notNull(),
  showFlagsToParents: boolean('show_flags_to_parents').default(false).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

export const appreciations = pgTable('appreciations', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  studentId: text('student_id').notNull(),
  subjectId: text('subject_id'),
  termId: text('term_id').notNull(),
  authorId: text('author_id').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, (table) => ({
  subject: uniqueIndex('appreciations_subject_uniq').on(table.schoolId, table.studentId, table.termId, table.subjectId).where(sql`${table.subjectId} is not null`),
  general: uniqueIndex('appreciations_general_uniq').on(table.schoolId, table.studentId, table.termId).where(sql`${table.subjectId} is null`),
}));

export const messageThreads = pgTable('message_threads', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  studentId: text('student_id').notNull(),
  teacherId: text('teacher_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  threadId: text('thread_id').notNull(),
  authorId: text('author_id').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, {
    fields: [users.schoolId],
    references: [schools.id],
  }),
  teacherSubjects: many(teacherSubjects),
  teacherClasses: many(teacherClasses),
  teacherAvailability: many(teacherAvailability),
  studentEnrollments: many(studentEnrollments),
  parentStudents: many(parentStudents),
}));

export const schoolsRelations = relations(schools, ({ many }) => ({
  users: many(users),
  academicLevels: many(academicLevels),
  classes: many(classes),
  subjects: many(subjects),
  timeSlotTemplates: many(timeSlotTemplates),
  timeSlots: many(timeSlots),
  timetables: many(timetables),
  invitations: many(invitations),
  teacherAvailability: many(teacherAvailability),
}));

export const academicLevelsRelations = relations(academicLevels, ({ one, many }) => ({
  school: one(schools, {
    fields: [academicLevels.schoolId],
    references: [schools.id],
  }),
  classes: many(classes),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  school: one(schools, {
    fields: [classes.schoolId],
    references: [schools.id],
  }),
  level: one(academicLevels, {
    fields: [classes.levelId],
    references: [academicLevels.id],
  }),
  timeSlotTemplate: one(timeSlotTemplates, {
    fields: [classes.timeSlotTemplateId],
    references: [timeSlotTemplates.id],
  }),
  teacherClasses: many(teacherClasses),
  studentEnrollments: many(studentEnrollments),
  timetables: many(timetables),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  school: one(schools, {
    fields: [subjects.schoolId],
    references: [schools.id],
  }),
  teacherSubjects: many(teacherSubjects),
  teacherClasses: many(teacherClasses),
  timetables: many(timetables),
}));

export const teacherSubjectsRelations = relations(teacherSubjects, ({ one }) => ({
  teacher: one(users, {
    fields: [teacherSubjects.teacherId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [teacherSubjects.subjectId],
    references: [subjects.id],
  }),
}));

export const teacherClassesRelations = relations(teacherClasses, ({ one }) => ({
  teacher: one(users, {
    fields: [teacherClasses.teacherId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [teacherClasses.classId],
    references: [classes.id],
  }),
  subject: one(subjects, {
    fields: [teacherClasses.subjectId],
    references: [subjects.id],
  }),
}));

export const teacherAvailabilityRelations = relations(teacherAvailability, ({ one }) => ({
  teacher: one(users, {
    fields: [teacherAvailability.teacherId],
    references: [users.id],
  }),
  school: one(schools, {
    fields: [teacherAvailability.schoolId],
    references: [schools.id],
  }),
}));

export const studentEnrollmentsRelations = relations(studentEnrollments, ({ one }) => ({
  student: one(users, {
    fields: [studentEnrollments.studentId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [studentEnrollments.classId],
    references: [classes.id],
  }),
}));

export const parentStudentsRelations = relations(parentStudents, ({ one }) => ({
  parent: one(users, {
    fields: [parentStudents.parentId],
    references: [users.id],
  }),
  student: one(users, {
    fields: [parentStudents.studentId],
    references: [users.id],
  }),
}));

export const timeSlotTemplatesRelations = relations(timeSlotTemplates, ({ one, many }) => ({
  school: one(schools, {
    fields: [timeSlotTemplates.schoolId],
    references: [schools.id],
  }),
  creator: one(users, {
    fields: [timeSlotTemplates.createdBy],
    references: [users.id],
  }),
  timeSlots: many(timeSlots),
  classes: many(classes),
}));

export const timeSlotsRelations = relations(timeSlots, ({ one, many }) => ({
  school: one(schools, {
    fields: [timeSlots.schoolId],
    references: [schools.id],
  }),
  template: one(timeSlotTemplates, {
    fields: [timeSlots.templateId],
    references: [timeSlotTemplates.id],
  }),
  timetables: many(timetables),
}));

export const timetablesRelations = relations(timetables, ({ one }) => ({
  school: one(schools, {
    fields: [timetables.schoolId],
    references: [schools.id],
  }),
  class: one(classes, {
    fields: [timetables.classId],
    references: [classes.id],
  }),
  subject: one(subjects, {
    fields: [timetables.subjectId],
    references: [subjects.id],
  }),
  teacher: one(users, {
    fields: [timetables.teacherId],
    references: [users.id],
  }),
  timeSlot: one(timeSlots, {
    fields: [timetables.timeSlotId],
    references: [timeSlots.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  school: one(schools, {
    fields: [invitations.schoolId],
    references: [schools.id],
  }),
  creator: one(users, {
    fields: [invitations.createdBy],
    references: [users.id],
  }),
}));

