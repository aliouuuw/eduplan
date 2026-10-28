// Demo slice for the teacher-home mock (studio-vif): Aïssatou Diop, maths,
// trimestre 1 week 8, 3ème B with 31 students. Idempotent for school id `demo-dakar`.
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

import {
  academicLevels,
  academicYears,
  appreciations,
  attachments,
  attendanceRecords,
  chapters,
  classChapterPlans,
  classes,
  flagRules,
  grades,
  messageThreads,
  messages,
  notionCoverage,
  notions,
  notifications,
  posts,
  programmes,
  remarks,
  schoolSettings,
  schools,
  studentEnrollments,
  studentFlags,
  subjects,
  timeSlots,
  timetables,
  submissions,
  teacherClasses,
  teacherSubjects,
  teacherTermGradeTargets,
  terms,
  topics,
  users,
} from '@/db/schema';
import type { Database } from '@/lib/db';

export const DEMO_SCHOOL_ID = 'demo-dakar';
const NOW = new Date('2026-10-26T10:00:00Z');

const FIRST = ['Awa', 'Lamine', 'Cheikh', 'Aïda', 'Pape', 'Astou', 'Modou', 'Rokhaya', 'Omar', 'Ndeye'];
const LAST = ['Diop', 'Ndiaye', 'Fall', 'Sow', 'Sarr', 'Ba', 'Diallo', 'Gueye', 'Faye', 'Seck'];

function nameAt(i: number) {
  return `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]} ${i + 1}`;
}

async function clear(db: Database) {
  const schoolId = DEMO_SCHOOL_ID;
  for (const table of [
    messages, messageThreads, appreciations, schoolSettings, flagRules, studentFlags, remarks,
    attendanceRecords, timetables, timeSlots,
    notionCoverage, classChapterPlans, notions, chapters, programmes, notifications,
    teacherTermGradeTargets,
    attendanceRecords, grades, attachments, submissions, posts, topics, terms, academicYears,
    studentEnrollments, teacherClasses, teacherSubjects,
  ] as const) {
    await db.delete(table).where(eq(table.schoolId, schoolId));
  }
  await db.delete(classes).where(eq(classes.schoolId, schoolId));
  await db.delete(subjects).where(eq(subjects.schoolId, schoolId));
  await db.delete(academicLevels).where(eq(academicLevels.schoolId, schoolId));
  await db.delete(users).where(eq(users.schoolId, schoolId));
  await db.delete(schools).where(eq(schools.id, schoolId));
}

export async function seedDemo(db: Database) {
  await clear(db);
  await db.insert(schools).values({
    id: DEMO_SCHOOL_ID,
    name: 'École Internationale de Dakar',
    schoolCode: 'DAKAR-DEMO',
    address: 'Avenue Cheikh Anta Diop, Dakar',
    timeZone: 'Africa/Dakar',
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  });
  await db.insert(users).values({
    id: 'demo-aissatou',
    email: 'aissatou.diop@demo.eduplan',
    password: await bcrypt.hash('Demo@123', 10),
    name: 'Aïssatou Diop',
    role: 'teacher',
    schoolId: DEMO_SCHOOL_ID,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  });
  await db.insert(academicLevels).values({
    id: 'demo-secondary',
    schoolId: DEMO_SCHOOL_ID,
    name: 'Secondary',
    description: '6ème to Terminale',
    createdAt: NOW,
    updatedAt: NOW,
  });
  await db.insert(subjects).values({
    id: 'demo-math',
    schoolId: DEMO_SCHOOL_ID,
    name: 'Mathématiques',
    code: 'MATH',
    weeklyHours: 5,
    createdAt: NOW,
    updatedAt: NOW,
  });

  await db.insert(academicYears).values({
    id: 'demo-year',
    schoolId: DEMO_SCHOOL_ID,
    name: '2025-2026',
    startsOn: '2026-09-07',
    endsOn: '2027-06-30',
    isCurrent: true,
    createdAt: NOW,
    updatedAt: NOW,
  });

  const classSizes = [
    { id: 'demo-4a', name: '4ème A', n: 28 },
    { id: 'demo-4b', name: '4ème B', n: 30 },
    { id: 'demo-3b', name: '3ème B', n: 31 },
    { id: 'demo-6a', name: '6ème A', n: 25 },
  ] as const;
  for (const c of classSizes) {
    await db.insert(classes).values({
      id: c.id,
      schoolId: DEMO_SCHOOL_ID,
      levelId: 'demo-secondary',
      name: c.name,
      academicYear: '2025-2026',
      academicYearId: 'demo-year',
      capacity: c.n,
      headTeacherId: c.id === 'demo-3b' ? 'demo-aissatou' : null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    await db.insert(teacherClasses).values({
      id: `tc-${c.id}`,
      teacherId: 'demo-aissatou',
      classId: c.id,
      subjectId: 'demo-math',
      schoolId: DEMO_SCHOOL_ID,
      weeklyHours: 4,
      createdAt: NOW,
    });
  }
  await db.insert(teacherSubjects).values({
    id: 'ts-math',
    teacherId: 'demo-aissatou',
    subjectId: 'demo-math',
    schoolId: DEMO_SCHOOL_ID,
    createdAt: NOW,
  });

  const pinned: Record<string, { id: string; name: string }[]> = {
    'demo-4a': [
      { id: 'stu-moussa', name: 'Moussa Ndiaye' },
      { id: 'stu-fatou', name: 'Fatou Sarr' },
    ],
    'demo-3b': [{ id: 'stu-khady', name: 'Khady Fall' }],
    'demo-4b': [{ id: 'stu-ibrahima', name: 'Ibrahima Sow' }],
  };
  const students: { id: string; classId: string }[] = [];
  let extra = 0;
  for (const c of classSizes) {
    const named = pinned[c.id] ?? [];
    for (let i = 0; i < c.n; i++) {
      const pin = named[i];
      const id = pin?.id ?? `stu-${c.id}-${i}`;
      const name = pin?.name ?? nameAt(extra++);
      await db.insert(users).values({
        id,
        email: `${id}@demo.eduplan`,
        password: 'not-a-login',
        name,
        role: 'student',
        schoolId: DEMO_SCHOOL_ID,
        isActive: true,
        createdAt: NOW,
        updatedAt: NOW,
      });
      await db.insert(studentEnrollments).values({
        id: `enr-${id}`,
        studentId: id,
        classId: c.id,
        schoolId: DEMO_SCHOOL_ID,
        academicYear: '2025-2026',
        enrollmentDate: NOW,
        isActive: true,
      });
      students.push({ id, classId: c.id });
    }
  }

  await db.insert(terms).values({
    id: 'demo-t1',
    schoolId: DEMO_SCHOOL_ID,
    academicYearId: 'demo-year',
    name: 'Trimestre 1',
    position: 1,
    startsOn: '2026-09-07',
    endsOn: '2026-11-29',
    createdAt: NOW,
    updatedAt: NOW,
  });

  await db.insert(programmes).values({
    id: 'demo-prog',
    schoolId: DEMO_SCHOOL_ID,
    subjectId: 'demo-math',
    levelId: 'demo-secondary',
    name: 'Mathématiques collège',
    createdAt: NOW,
    updatedAt: NOW,
  });
  await db.insert(chapters).values([
    { id: 'demo-ch1', schoolId: DEMO_SCHOOL_ID, programmeId: 'demo-prog', title: 'Nombres entiers et rationnels', position: 1, createdAt: NOW, updatedAt: NOW },
    { id: 'demo-ch2', schoolId: DEMO_SCHOOL_ID, programmeId: 'demo-prog', title: 'Calcul littéral', position: 2, createdAt: NOW, updatedAt: NOW },
    { id: 'demo-ch3', schoolId: DEMO_SCHOOL_ID, programmeId: 'demo-prog', title: 'Théorème de Pythagore', position: 3, createdAt: NOW, updatedAt: NOW },
    { id: 'demo-ch4', schoolId: DEMO_SCHOOL_ID, programmeId: 'demo-prog', title: 'Théorème de Thalès', position: 4, createdAt: NOW, updatedAt: NOW },
    { id: 'demo-ch5', schoolId: DEMO_SCHOOL_ID, programmeId: 'demo-prog', title: 'Racines carrées', position: 5, createdAt: NOW, updatedAt: NOW },
  ]);
  const notionIds: Record<string, string[]> = { 'demo-ch3': [], 'demo-ch4': [] };
  for (const [chapterId, count] of [['demo-ch3', 18], ['demo-ch4', 20]] as const) {
    for (let i = 1; i <= count; i++) {
      const id = `${chapterId}-n${i}`;
      notionIds[chapterId].push(id);
      await db.insert(notions).values({
        id,
        schoolId: DEMO_SCHOOL_ID,
        chapterId,
        title: `Notion ${i}`,
        position: i,
        createdAt: NOW,
        updatedAt: NOW,
      });
    }
  }
  const covered = [
    { classId: 'demo-4a', chapterId: 'demo-ch3', n: 13, status: 'current' as const },
    { classId: 'demo-4b', chapterId: 'demo-ch3', n: 10, status: 'current' as const },
    { classId: 'demo-3b', chapterId: 'demo-ch4', n: 11, status: 'current' as const },
  ];
  const plans3b = [
    { id: 'plan-3b-ch1', chapterId: 'demo-ch1', position: 1, start: 1, end: 2, status: 'done' as const },
    { id: 'plan-3b-ch2', chapterId: 'demo-ch2', position: 2, start: 3, end: 4, status: 'done' as const },
    { id: 'plan-3b-ch3', chapterId: 'demo-ch3', position: 3, start: 5, end: 6, status: 'done' as const },
    { id: 'plan-3b-ch4', chapterId: 'demo-ch4', position: 4, start: 7, end: 9, status: 'current' as const },
    { id: 'plan-3b-ch5', chapterId: 'demo-ch5', position: 5, start: 10, end: 12, status: 'upcoming' as const },
  ];
  for (const row of plans3b) {
    await db.insert(classChapterPlans).values({
      id: row.id,
      schoolId: DEMO_SCHOOL_ID,
      classId: 'demo-3b',
      subjectId: 'demo-math',
      chapterId: row.chapterId,
      position: row.position,
      plannedWeek: 8,
      plannedWeekStart: row.start,
      plannedWeekEnd: row.end,
      status: row.status,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }
  for (const row of covered.filter((entry) => entry.classId !== 'demo-3b')) {
    await db.insert(classChapterPlans).values({
      id: `plan-${row.classId}`,
      schoolId: DEMO_SCHOOL_ID,
      classId: row.classId,
      subjectId: 'demo-math',
      chapterId: row.chapterId,
      position: 1,
      plannedWeek: 8,
      plannedWeekStart: 5,
      plannedWeekEnd: 10,
      status: row.status,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }
  for (const row of covered) {
    for (let i = 0; i < row.n; i++) {
      await db.insert(notionCoverage).values({
        id: `cov-${row.classId}-${row.chapterId}-${i}`,
        schoolId: DEMO_SCHOOL_ID,
        classId: row.classId,
        subjectId: 'demo-math',
        notionId: notionIds[row.chapterId][i],
        coveredAt: NOW,
      });
    }
  }

  await db.insert(flagRules).values([
    { id: 'rule-avg', schoolId: DEMO_SCHOOL_ID, kind: 'average', threshold: 10, enabled: true, updatedAt: NOW },
    { id: 'rule-abs', schoolId: DEMO_SCHOOL_ID, kind: 'absences', threshold: 3, enabled: true, updatedAt: NOW },
    { id: 'rule-miss', schoolId: DEMO_SCHOOL_ID, kind: 'missing', threshold: 2, enabled: true, updatedAt: NOW },
  ]);
  await db.insert(schoolSettings).values({
    schoolId: DEMO_SCHOOL_ID,
    showFlagsToStudents: false,
    showFlagsToParents: false,
    updatedAt: NOW,
  });
  await db.insert(studentFlags).values([
    { id: 'flag-moussa', schoolId: DEMO_SCHOOL_ID, studentId: 'stu-moussa', subjectId: 'demo-math', source: 'rule', ruleKind: 'absences', reason: '3 absences sans justificatif', createdAt: NOW },
    { id: 'flag-khady', schoolId: DEMO_SCHOOL_ID, studentId: 'stu-khady', subjectId: 'demo-math', source: 'rule', ruleKind: 'average', reason: 'Moyenne 8,5 / 20', createdAt: NOW },
    { id: 'flag-ibrahima', schoolId: DEMO_SCHOOL_ID, studentId: 'stu-ibrahima', subjectId: 'demo-math', source: 'rule', ruleKind: 'missing', reason: '2 devoirs non rendus', createdAt: NOW },
    { id: 'flag-fatou', schoolId: DEMO_SCHOOL_ID, studentId: 'stu-fatou', subjectId: 'demo-math', source: 'teacher', ruleKind: null, reason: 'Ne participe plus depuis 2 semaines', createdAt: NOW },
  ]);
  await db.insert(teacherTermGradeTargets).values({
    id: 'demo-aissatou-t1-grades',
    schoolId: DEMO_SCHOOL_ID,
    teacherId: 'demo-aissatou',
    termId: 'demo-t1',
    expectedEntries: 15,
    createdAt: NOW,
    updatedAt: NOW,
  });

  await db.insert(posts).values({
    id: 'demo-dm3',
    schoolId: DEMO_SCHOOL_ID,
    classId: 'demo-4a',
    subjectId: 'demo-math',
    authorId: 'demo-aissatou',
    type: 'assignment',
    assignmentFormat: 'homework',
    title: 'Devoir maison n°3',
    maxGrade: 20,
    createdAt: NOW,
    updatedAt: NOW,
  });
  const class4a = students.filter((s) => s.classId === 'demo-4a');
  for (let i = 0; i < class4a.length; i++) {
    const status = i < 16 ? 'submitted' : i < 22 ? 'late' : 'assigned';
    await db.insert(submissions).values({
      id: `sub-dm3-${i}`,
      schoolId: DEMO_SCHOOL_ID,
      postId: 'demo-dm3',
      studentId: class4a[i].id,
      status,
      submittedAt: status === 'assigned' ? null : NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }
  await db.insert(posts).values({
    id: 'demo-pyth',
    schoolId: DEMO_SCHOOL_ID,
    classId: 'demo-3b',
    subjectId: 'demo-math',
    authorId: 'demo-aissatou',
    type: 'assignment',
    assignmentFormat: 'paper',
    title: 'Contrôle Pythagore',
    maxGrade: 20,
    createdAt: NOW,
    updatedAt: NOW,
  });
  const class3b = students.filter((s) => s.classId === 'demo-3b');
  for (let i = 0; i < class3b.length; i++) {
    await db.insert(submissions).values({
      id: `sub-pyth-${i}`,
      schoolId: DEMO_SCHOOL_ID,
      postId: 'demo-pyth',
      studentId: class3b[i].id,
      status: 'submitted',
      submittedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  const daySlots = [
    { id: 'slot-0800', start: '08:00', end: '09:00', classId: 'demo-4a', room: 'Salle 12', topic: 'Pythagore' },
    { id: 'slot-1000', start: '10:00', end: '11:00', classId: 'demo-3b', room: 'Salle 7', topic: 'Correction DM' },
    { id: 'slot-1400', start: '14:00', end: '15:00', classId: 'demo-4b', room: 'Salle 12', topic: 'Thalès' },
    { id: 'slot-1600', start: '16:00', end: '17:00', classId: 'demo-6a', room: 'Salle 3', topic: 'Calcul' },
  ];
  for (const slot of daySlots) {
    await db.insert(timeSlots).values({
      id: slot.id,
      schoolId: DEMO_SCHOOL_ID,
      dayOfWeek: 2,
      startTime: slot.start,
      endTime: slot.end,
      name: slot.start,
      isBreak: false,
      createdAt: NOW,
    });
    await db.insert(timetables).values({
      id: `tt-${slot.id}`,
      schoolId: DEMO_SCHOOL_ID,
      classId: slot.classId,
      subjectId: 'demo-math',
      teacherId: 'demo-aissatou',
      timeSlotId: slot.id,
      academicYear: '2025-2026',
      room: slot.room,
      topic: slot.topic,
      status: 'active',
      createdAt: NOW,
      updatedAt: NOW,
    });
  }
  for (const studentId of ['stu-demo-4a-2', 'stu-demo-4a-3']) {
    await db.insert(attendanceRecords).values({
      id: `abs-${studentId}`,
      schoolId: DEMO_SCHOOL_ID,
      studentId,
      timetableId: 'tt-slot-0800',
      date: '2026-10-27',
      status: 'absent',
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  const gradeStudents = ['stu-khady', 'stu-khady', ...students.filter((s) => s.id !== 'stu-khady').slice(0, 7).map((s) => s.id)];
  for (let i = 0; i < gradeStudents.length; i++) {
    const weekOffset = i % 7;
    const createdAt = new Date(Date.parse('2026-09-07T12:00:00Z') + weekOffset * 7 * 86_400_000);
    await db.insert(grades).values({
      id: `grade-${i}`,
      schoolId: DEMO_SCHOOL_ID,
      studentId: gradeStudents[i],
      subjectId: 'demo-math',
      classId: gradeStudents[i] === 'stu-khady' ? 'demo-3b' : 'demo-4a',
      termId: 'demo-t1',
      value: gradeStudents[i] === 'stu-khady' ? (i === 0 ? 8 : 9) : 12,
      coefficient: 1,
      createdAt,
      updatedAt: createdAt,
    });
  }
}
