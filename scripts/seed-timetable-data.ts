/**
 * Comprehensive Database Seeding Script for Timetable Building
 * 
 * This script creates:
 * - A sample school with realistic data
 * - Academic levels (Class Groups: Primary, Secondary)
 * - Multiple classes per level with proper hierarchy
 * - Core subjects for each level
 * - Teachers with realistic availability
 * - Teacher-subject assignments
 * - Teacher-class assignments with subject-specific mappings
 * - Student enrollments in classes
 * - Time slots for comprehensive scheduling
 * 
 * Run: bun run scripts/seed-timetable-data.ts
 * 
 * Prerequisites: 
 * - Run scripts/reset-database.ts first if you want a clean slate
 * - Superadmin accounts will be preserved
 */

import { db, getCurrentTimestamp } from '../src/lib/db';
import { generateId } from '../src/lib/utils';
import {
  users,
  schools,
  academicLevels,
  classes,
  subjects,
  teacherSubjects,
  teacherClasses,
  teacherAvailability,
  studentEnrollments,
  timeSlots
} from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { ensureLogin, seedPassword } from './neon-login';

// Configuration
const SCHOOL_NAME = "École Internationale de Dakar";
const SCHOOL_CODE = "DAKAR-INT-2025";
const ACADEMIC_YEAR = "2025-2026";

// Sample data
const ACADEMIC_LEVELS = [
  { name: "Primary", description: "Elementary education (CP to CM2)" },
  { name: "Secondary", description: "Middle and high school (6ème to Terminale)" }
];

const PRIMARY_CLASSES = [
  { name: "CP A", level: "Primary", capacity: 25 },
  { name: "CP B", level: "Primary", capacity: 25 },
  { name: "CE1 A", level: "Primary", capacity: 28 },
  { name: "CE1 B", level: "Primary", capacity: 28 },
  { name: "CE2 A", level: "Primary", capacity: 30 },
  { name: "CE2 B", level: "Primary", capacity: 30 },
  { name: "CM1 A", level: "Primary", capacity: 30 },
  { name: "CM1 B", level: "Primary", capacity: 30 },
  { name: "CM2 A", level: "Primary", capacity: 32 },
  { name: "CM2 B", level: "Primary", capacity: 32 }
];

const SECONDARY_CLASSES = [
  { name: "6ème A", level: "Secondary", capacity: 35 },
  { name: "6ème B", level: "Secondary", capacity: 35 },
  { name: "5ème A", level: "Secondary", capacity: 35 },
  { name: "5ème B", level: "Secondary", capacity: 35 },
  { name: "4ème A", level: "Secondary", capacity: 35 },
  { name: "4ème B", level: "Secondary", capacity: 35 },
  { name: "3ème A", level: "Secondary", capacity: 35 },
  { name: "3ème B", level: "Secondary", capacity: 35 },
  { name: "2nde A", level: "Secondary", capacity: 30 },
  { name: "2nde B", level: "Secondary", capacity: 30 },
  { name: "1ère A", level: "Secondary", capacity: 30 },
  { name: "1ère B", level: "Secondary", capacity: 30 },
  { name: "Terminale A", level: "Secondary", capacity: 30 },
  { name: "Terminale B", level: "Secondary", capacity: 30 }
];

const PRIMARY_SUBJECTS = [
  { name: "French", code: "FR", description: "French language and literature", weeklyHours: 6 },
  { name: "Mathematics", code: "MATH", description: "Basic mathematics and problem solving", weeklyHours: 5 },
  { name: "Science", code: "SCI", description: "Natural sciences and discovery", weeklyHours: 3 },
  { name: "History-Geography", code: "HG", description: "History and geography", weeklyHours: 3 },
  { name: "English", code: "ENG", description: "English as a foreign language", weeklyHours: 3 },
  { name: "Physical Education", code: "PE", description: "Sports and physical activities", weeklyHours: 3 },
  { name: "Arts", code: "ART", description: "Visual and performing arts", weeklyHours: 2 },
  { name: "Music", code: "MUS", description: "Music education", weeklyHours: 2 }
];

const SECONDARY_SUBJECTS = [
  { name: "French", code: "FR", description: "French language and literature", weeklyHours: 5 },
  { name: "Mathematics", code: "MATH", description: "Advanced mathematics", weeklyHours: 5 },
  { name: "Physics-Chemistry", code: "PC", description: "Physics and chemistry", weeklyHours: 4 },
  { name: "Biology", code: "BIO", description: "Life sciences", weeklyHours: 3 },
  { name: "History-Geography", code: "HG", description: "History and geography", weeklyHours: 4 },
  { name: "English", code: "ENG", description: "English language", weeklyHours: 3 },
  { name: "Spanish", code: "ESP", description: "Spanish language", weeklyHours: 3 },
  { name: "Physical Education", code: "PE", description: "Sports and physical activities", weeklyHours: 3 },
  { name: "Philosophy", code: "PHIL", description: "Philosophy and critical thinking", weeklyHours: 3 },
  { name: "Economics", code: "ECO", description: "Economics and social sciences", weeklyHours: 3 },
  { name: "Computer Science", code: "INFO", description: "Computer science and programming", weeklyHours: 2 }
];

const TEACHERS = [
  // Primary teachers
  { name: "Marie Diop", email: "marie.diop@school.edu", subjects: ["French"], level: "Primary" },
  { name: "Amadou Ba", email: "amadou.ba@school.edu", subjects: ["Mathematics"], level: "Primary" },
  { name: "Fatou Sall", email: "fatou.sall@school.edu", subjects: ["Science"], level: "Primary" },
  { name: "Ibrahima Ndiaye", email: "ibrahima.ndiaye@school.edu", subjects: ["English"], level: "Primary" },
  { name: "Aïcha Fall", email: "aicha.fall@school.edu", subjects: ["Physical Education"], level: "Primary" },
  { name: "Moussa Diallo", email: "moussa.diallo@school.edu", subjects: ["Arts", "Music"], level: "Primary" },
  { name: "Khady Gueye", email: "khady.gueye@school.edu", subjects: ["History-Geography"], level: "Primary" },
  
  // Secondary teachers
  { name: "Aminata Sow", email: "aminata.sow@school.edu", subjects: ["French"], level: "Secondary" },
  { name: "Ousmane Camara", email: "ousmane.camara@school.edu", subjects: ["Mathematics"], level: "Secondary" },
  { name: "Binta Sarr", email: "binta.sarr@school.edu", subjects: ["Physics-Chemistry"], level: "Secondary" },
  { name: "Malick Sy", email: "malick.sy@school.edu", subjects: ["Biology"], level: "Secondary" },
  { name: "Seynabou Dieng", email: "seynabou.dieng@school.edu", subjects: ["History-Geography"], level: "Secondary" },
  { name: "Mamadou Cissé", email: "mamadou.cisse@school.edu", subjects: ["English"], level: "Secondary" },
  { name: "Fatima Kane", email: "fatima.kane@school.edu", subjects: ["Spanish"], level: "Secondary" },
  { name: "Abdou Diouf", email: "abdou.diouf@school.edu", subjects: ["Physical Education"], level: "Secondary" },
  { name: "Khadija Mbaye", email: "khadija.mbaye@school.edu", subjects: ["Philosophy", "Economics"], level: "Secondary" },
  { name: "Cheikh Thiam", email: "cheikh.thiam@school.edu", subjects: ["Computer Science"], level: "Secondary" }
];

const STUDENTS_PER_CLASS = 20; // Number of students to create per class

// Time slots for a typical school day
const TIME_SLOTS = [
  // Monday to Friday
  { dayOfWeek: 1, startTime: "08:00", endTime: "08:50", name: "1st Period", isBreak: false },
  { dayOfWeek: 1, startTime: "08:50", endTime: "09:40", name: "2nd Period", isBreak: false },
  { dayOfWeek: 1, startTime: "09:40", endTime: "10:00", name: "Morning Break", isBreak: true },
  { dayOfWeek: 1, startTime: "10:00", endTime: "10:50", name: "3rd Period", isBreak: false },
  { dayOfWeek: 1, startTime: "10:50", endTime: "11:40", name: "4th Period", isBreak: false },
  { dayOfWeek: 1, startTime: "11:40", endTime: "12:30", name: "5th Period", isBreak: false },
  { dayOfWeek: 1, startTime: "12:30", endTime: "14:00", name: "Lunch Break", isBreak: true },
  { dayOfWeek: 1, startTime: "14:00", endTime: "14:50", name: "6th Period", isBreak: false },
  { dayOfWeek: 1, startTime: "14:50", endTime: "15:40", name: "7th Period", isBreak: false },
  { dayOfWeek: 1, startTime: "15:40", endTime: "16:00", name: "Afternoon Break", isBreak: true },
  { dayOfWeek: 1, startTime: "16:00", endTime: "16:50", name: "8th Period", isBreak: false },
];

// Generate time slots for all weekdays (Monday to Friday)
const ALL_TIME_SLOTS: typeof TIME_SLOTS[number][] = [];
for (let day = 1; day <= 5; day++) {
  TIME_SLOTS.forEach(slot => {
    ALL_TIME_SLOTS.push({
      ...slot,
      dayOfWeek: day
    });
  });
}

async function seedTimetableData() {
  try {
    console.log('🌱 Starting comprehensive database seeding...');
    
    // Check if school already exists
    const existingSchool = await db
      .select()
      .from(schools)
      .where(eq(schools.schoolCode, SCHOOL_CODE))
      .limit(1);

    if (existingSchool.length > 0) {
      console.log('⚠️  School already exists! Skipping seeding to avoid duplicates.');
      console.log('If you want to reseed, please delete the existing school first.');
      return;
    }

    const now = getCurrentTimestamp();
    
    // 1. Create School
    console.log('🏫 Creating school...');
    const schoolId = generateId();
    await db.insert(schools).values({
      id: schoolId,
      name: SCHOOL_NAME,
      schoolCode: SCHOOL_CODE,
      address: "Avenue Cheikh Anta Diop, Dakar, Senegal",
      phone: "+221 33 825 1234",
      email: "contact@ecole-dakar.edu",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Create School Admin
    console.log('👨‍💼 Creating school admin...');
    const adminId = generateId();
    await db.insert(users).values({
      id: adminId,
      email: 'admin@ecole-dakar.edu',
      authUserId: await ensureLogin('admin@ecole-dakar.edu', 'School Administrator', seedPassword()),
      name: 'School Administrator',
      role: 'admin',
      schoolId: schoolId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // 3. Create Academic Levels (Class Groups)
    console.log('📚 Creating class groups (academic levels)...');
    const levelIds: { [key: string]: string } = {};
    for (const level of ACADEMIC_LEVELS) {
      const levelId = generateId();
      levelIds[level.name] = levelId;
      await db.insert(academicLevels).values({
        id: levelId,
        schoolId: schoolId,
        name: level.name,
        description: level.description,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`  ✓ Created class group: ${level.name}`);
    }

    // 4. Create Classes
    console.log('🏫 Creating classes...');
    const classIds: { [key: string]: string } = {};
    const allClasses = [...PRIMARY_CLASSES, ...SECONDARY_CLASSES];
    
    for (const cls of allClasses) {
      const classId = generateId();
      classIds[cls.name] = classId;
      await db.insert(classes).values({
        id: classId,
        schoolId: schoolId,
        levelId: levelIds[cls.level],
        name: cls.name,
        academicYear: ACADEMIC_YEAR,
        capacity: cls.capacity,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 5. Create Subjects (Global Library)
    console.log('📖 Creating subjects library...');
    const subjectIds: { [key: string]: string } = {};
    const allSubjects = [...PRIMARY_SUBJECTS, ...SECONDARY_SUBJECTS];
    
    // Use Set to avoid duplicates (some subjects appear in both levels)
    const uniqueSubjects = Array.from(
      new Map(allSubjects.map(s => [s.name, s])).values()
    );
    
    for (const subject of uniqueSubjects) {
      const subjectId = generateId();
      subjectIds[subject.name] = subjectId;
      await db.insert(subjects).values({
        id: subjectId,
        schoolId: schoolId,
        name: subject.name,
        code: subject.code,
        description: subject.description,
        weeklyHours: subject.weeklyHours,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`  ✓ Created subject: ${subject.name} (${subject.weeklyHours}h/week)`);
    }

    // 6. Create Teachers
    console.log('👨‍🏫 Creating teachers...');
    const teacherIds: { [key: string]: string } = {};
    
    for (const teacher of TEACHERS) {
      const teacherId = generateId();
      teacherIds[teacher.name] = teacherId;
      await db.insert(users).values({
        id: teacherId,
        email: teacher.email,
        name: teacher.name,
        role: 'teacher',
        schoolId: schoolId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 7. Create Teacher-Subject Assignments
    console.log('🔗 Assigning subjects to teachers...');
    for (const teacher of TEACHERS) {
      for (const subjectName of teacher.subjects) {
        if (subjectIds[subjectName]) {
          await db.insert(teacherSubjects).values({
            id: generateId(),
            teacherId: teacherIds[teacher.name],
            subjectId: subjectIds[subjectName],
            schoolId: schoolId,
            createdAt: now,
          });
        }
      }
    }

    // 8. Create Teacher-Class Assignments (assign teachers to classes for their subjects)
    console.log('🎯 Assigning teachers to classes...');
    const primaryClasses = Object.keys(classIds).filter(name => PRIMARY_CLASSES.some(c => c.name === name));
    const secondaryClasses = Object.keys(classIds).filter(name => SECONDARY_CLASSES.some(c => c.name === name));
    
    // PRIMARY LEVEL: Ensure each primary class has ALL primary subjects
    console.log('  📚 Assigning all subjects to primary classes...');
    for (const className of primaryClasses) {
      for (const subject of PRIMARY_SUBJECTS) {
        // Find a teacher who can teach this subject
        const teacher = TEACHERS.find(t => 
          t.level === "Primary" && t.subjects.includes(subject.name)
        );
        
        if (teacher && subjectIds[subject.name]) {
          await db.insert(teacherClasses).values({
            id: generateId(),
            teacherId: teacherIds[teacher.name],
            classId: classIds[className],
            subjectId: subjectIds[subject.name],
            schoolId: schoolId,
            weeklyHours: subject.weeklyHours, // Class-specific weekly hours
            createdAt: now,
          });
        } else {
          console.warn(`  ⚠️  No teacher found for ${subject.name} in ${className}`);
        }
      }
    }

    // SECONDARY LEVEL: Ensure each secondary class has ALL secondary subjects
    console.log('  📚 Assigning all subjects to secondary classes...');
    for (const className of secondaryClasses) {
      for (const subject of SECONDARY_SUBJECTS) {
        // Find a teacher who can teach this subject
        const teacher = TEACHERS.find(t => 
          t.level === "Secondary" && t.subjects.includes(subject.name)
        );
        
        if (teacher && subjectIds[subject.name]) {
          await db.insert(teacherClasses).values({
            id: generateId(),
            teacherId: teacherIds[teacher.name],
            classId: classIds[className],
            subjectId: subjectIds[subject.name],
            schoolId: schoolId,
            weeklyHours: subject.weeklyHours, // Class-specific weekly hours
            createdAt: now,
          });
        } else {
          console.warn(`  ⚠️  No teacher found for ${subject.name} in ${className}`);
        }
      }
    }

    // 9. Create Teacher Availability
    console.log('⏰ Setting teacher availability...');
    for (const teacher of TEACHERS) {
      // Each teacher is available Monday-Friday, 8:00-17:00
      for (let day = 1; day <= 5; day++) {
        await db.insert(teacherAvailability).values({
          id: generateId(),
          teacherId: teacherIds[teacher.name],
          schoolId: schoolId,
          dayOfWeek: day,
          startTime: "08:00",
          endTime: "17:00",
          isRecurring: true,
          notes: "Available for regular classes",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // 10. Create Students
    console.log('👨‍🎓 Creating students...');
    const studentIds: string[] = [];
    
    for (const className of Object.keys(classIds)) {
      for (let i = 1; i <= STUDENTS_PER_CLASS; i++) {
        const studentId = generateId();
        studentIds.push(studentId);
        const studentName = `Student ${i} ${className}`;
        const studentEmail = `student${i}.${className.toLowerCase().replace(' ', '')}@school.edu`;
        
        await db.insert(users).values({
          id: studentId,
          email: studentEmail,
          name: studentName,
          role: 'student',
          schoolId: schoolId,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });

        // Enroll student in class
        await db.insert(studentEnrollments).values({
          id: generateId(),
          studentId: studentId,
          classId: classIds[className],
          schoolId: schoolId,
          academicYear: ACADEMIC_YEAR,
          enrollmentDate: now,
          isActive: true,
        });
      }
    }

    // 11. Create Time Slots
    console.log('⏱️  Creating time slots...');
    for (const slot of ALL_TIME_SLOTS) {
      await db.insert(timeSlots).values({
        id: generateId(),
        schoolId: schoolId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        name: slot.name,
        isBreak: slot.isBreak,
        createdAt: now,
      });
    }

    console.log('✅ Database seeding completed successfully!');
    console.log('');
    console.log('📊 COMPREHENSIVE SUMMARY:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`🏫 School: ${SCHOOL_NAME}`);
    console.log(`📚 Class Groups (Academic Levels): ${ACADEMIC_LEVELS.length}`);
    console.log(`   • ${ACADEMIC_LEVELS[0].name}: ${PRIMARY_CLASSES.length} classes`);
    console.log(`   • ${ACADEMIC_LEVELS[1].name}: ${SECONDARY_CLASSES.length} classes`);
    console.log(`🏫 Total Classes: ${allClasses.length}`);
    console.log(`📖 Subjects Library (Global):`);
    console.log(`   • Total unique subjects: ${Array.from(new Set([...PRIMARY_SUBJECTS.map(s => s.name), ...SECONDARY_SUBJECTS.map(s => s.name)])).length}`);
    console.log(`   • Primary subjects: ${PRIMARY_SUBJECTS.length} (with weekly hours)`);
    console.log(`   • Secondary subjects: ${SECONDARY_SUBJECTS.length} (with weekly hours)`);
    console.log(`👨‍🏫 Teachers: ${TEACHERS.length}`);
    console.log(`   • Primary teachers: ${TEACHERS.filter(t => t.level === "Primary").length}`);
    console.log(`   • Secondary teachers: ${TEACHERS.filter(t => t.level === "Secondary").length}`);
    console.log(`👨‍🎓 Students: ${studentIds.length} (${STUDENTS_PER_CLASS} per class)`);
    console.log(`⏱️  Time Slots: ${ALL_TIME_SLOTS.length} (5 days × ${TIME_SLOTS.length} slots per day)`);
    console.log(`   • Teaching periods: ${ALL_TIME_SLOTS.filter(s => !s.isBreak).length}`);
    console.log(`   • Break periods: ${ALL_TIME_SLOTS.filter(s => s.isBreak).length}`);
    console.log('');
    console.log('🔗 RELATIONSHIP HIERARCHY:');
    console.log(`   School → Class Groups → Classes → Subjects/Teachers`);
    console.log(`   • Primary: ${primaryClasses.length} classes × ${PRIMARY_SUBJECTS.length} subjects = ${primaryClasses.length * PRIMARY_SUBJECTS.length} assignments`);
    console.log(`   • Secondary: ${secondaryClasses.length} classes × ${SECONDARY_SUBJECTS.length} subjects = ${secondaryClasses.length * SECONDARY_SUBJECTS.length} assignments`);
    console.log(`   • Total teacher-class-subject assignments: ${(primaryClasses.length * PRIMARY_SUBJECTS.length) + (secondaryClasses.length * SECONDARY_SUBJECTS.length)}`);
    console.log('');
    console.log('🔑 LOGIN CREDENTIALS:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📧 Admin: admin@ecole-dakar.edu');
    console.log('🔒 Password: the SEED_PASSWORD value');
    console.log('');
    console.log('📧 Teachers: [teacher-email]@school.edu');
    console.log('🔒 No login: invite them from Personnes');
    console.log('');
    console.log('📧 Students: [student-email]@school.edu');
    console.log('🔒 No login: invite them from Personnes');
    console.log('');
    console.log('✅ READY FOR TIMETABLE BUILDING!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Each class now has:');
    console.log('  ✓ All required subjects assigned with class-specific weekly hours');
    console.log('  ✓ Qualified teachers for each subject');
    console.log('  ✓ Enrolled students');
    console.log('  ✓ Time slots available for scheduling');
    console.log('  ✓ Teacher availability set (Mon-Fri, 8:00-17:00)');
    console.log('');
    console.log('📊 NOTE: Weekly hours are now per-class-subject assignments');
    console.log('   (e.g., Math can be 5h/week in CM2 A but 4h/week in CM2 B)');
    console.log('');
    console.log('🚀 NAVIGATION FLOWS - EXPLORE YOUR DATA:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('1️⃣  LOGIN');
    console.log('   • Use admin credentials above to access the dashboard');
    console.log('');
    console.log('2️⃣  ACADEMIC STRUCTURE (unified navigation)');
    console.log('   📚 Class Groups → View Primary/Secondary → See classes in each group');
    console.log('   🏫 Classes → View all classes → Click for subjects, teachers, students');
    console.log('   📖 Subjects → Browse library → Click to see classes & teachers');
    console.log('   👨‍🏫 Teachers → View all staff → Click to see subjects, classes, availability');
    console.log('');
    console.log('3️⃣  DRILL-DOWN EXAMPLES');
    console.log('   • Class Groups → Primary → CM2 A → View subjects & teachers');
    console.log('   • Subjects → Mathematics → See all classes & who teaches them');
    console.log('   • Teachers → Marie Diop → View her schedule, availability & classes');
    console.log('');
    console.log('4️⃣  SCHEDULING HUB');
    console.log('   • Navigate to Scheduling → Timetables');
    console.log('   • Use auto-scheduler with weekly hour quotas');
    console.log('   • System prevents conflicts & validates availability automatically');
    console.log('');
    console.log('💡 TIPS:');
    console.log('   ✓ Follow breadcrumbs to understand data relationships');
    console.log('   ✓ Click cards to navigate between connected entities');
    console.log('   ✓ All subjects have weekly hours configured for scheduling');
    console.log('   ✓ All teachers have full-week availability (Mon-Fri, 8am-5pm)');
    console.log('═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seedTimetableData()
  .then(() => {
    console.log('✅ Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
