import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db, getCurrentTimestamp } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { subjects, teacherSubjects } from '@/db/schema';
import { canAccessSchool, isSuperAdmin, isSchoolAdmin } from '@/lib/auth';
import { teacherClasses } from '@/db/schema';
import { sql } from 'drizzle-orm';

const createSubjectSchema = z.object({
  schoolId: z.string(),
  name: z.string().min(1, 'Subject name is required'),
  code: z.string().optional(),
  description: z.string().optional(),
});

// GET /api/subjects - List subjects
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');

    // Validate school access
    if (schoolId) {
      if (!canAccessSchool(session.user.role, session.user.schoolId, schoolId)) {
        return NextResponse.json(
          { message: 'Forbidden - Cannot access this school' },
          { status: 403 }
        );
      }
    }

    // Build query with appropriate filters
    let allSubjects;
    // Get all subjects with their class count and qualified teacher count
    const allSubjectsQuery = await db.select({
      id: subjects.id,
      schoolId: subjects.schoolId,
      name: subjects.name,
      code: subjects.code,
      description: subjects.description,
      weeklyHours: subjects.weeklyHours,
      createdAt: subjects.createdAt,
      updatedAt: subjects.updatedAt,
    }).from(subjects);

    // Get class counts
    const classCounts = await db.select({
      subjectId: teacherClasses.subjectId,
      classCount: sql<number>`count(${teacherClasses.id})`,
    })
    .from(teacherClasses)
    .groupBy(teacherClasses.subjectId);

    // Get qualified teacher counts
    const teacherCounts = await db.select({
      subjectId: teacherSubjects.subjectId,
      teacherCount: sql<number>`count(${teacherSubjects.id})`,
    })
    .from(teacherSubjects)
    .groupBy(teacherSubjects.subjectId);

    // Combine the data
    const subjectsWithCounts = allSubjectsQuery.map(subject => {
      const classCount = classCounts.find(c => c.subjectId === subject.id)?.classCount || 0;
      const teacherCount = teacherCounts.find(t => t.subjectId === subject.id)?.teacherCount || 0;

      return {
        ...subject,
        classCount,
        teacherCount,
      };
    });

    if (schoolId) {
      allSubjects = subjectsWithCounts.filter(s => s.schoolId === schoolId);
    } else if (!isSuperAdmin(session.user.role) && session.user.schoolId) {
      allSubjects = subjectsWithCounts.filter(s => s.schoolId === session.user.schoolId);
    } else {
      allSubjects = subjectsWithCounts;
    }

    // Sort by name
    allSubjects.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ subjects: allSubjects });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/subjects - Create new subject
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only superadmin and school admin can create subjects
    if (!isSuperAdmin(session.user.role) && !isSchoolAdmin(session.user.role)) {
      return NextResponse.json(
        { message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { schoolId, name, code, description } = createSubjectSchema.parse(body);

    // Validate school access
    if (!canAccessSchool(session.user.role, session.user.schoolId, schoolId)) {
      return NextResponse.json(
        { message: 'Forbidden - Cannot access this school' },
        { status: 403 }
      );
    }

    // Check if subject with same name exists in the school
    const existingSubject = await db
      .select()
      .from(subjects)
      .where(and(
        eq(subjects.schoolId, schoolId),
        eq(subjects.name, name)
      ))
      .limit(1);

    if (existingSubject.length > 0) {
      return NextResponse.json(
        { message: 'Subject with this name already exists in this school' },
        { status: 400 }
      );
    }

    // Check if code is provided and unique in the school
    if (code) {
      const existingCode = await db
        .select()
        .from(subjects)
        .where(and(
          eq(subjects.schoolId, schoolId),
          eq(subjects.code, code)
        ))
        .limit(1);

      if (existingCode.length > 0) {
        return NextResponse.json(
          { message: 'Subject code already exists in this school' },
          { status: 400 }
        );
      }
    }

    const subjectId = generateId();
    const now = getCurrentTimestamp();

    const newSubject = await db.insert(subjects).values({
      id: subjectId,
      schoolId,
      name,
      code: code || null,
      description: description || null,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json(
      { 
        message: 'Subject created successfully',
        subject: newSubject[0]
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating subject:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid input data', errors: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
