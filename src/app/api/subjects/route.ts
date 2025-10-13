import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db, getCurrentTimestamp } from '@/lib/db';
import { generateId } from '@/lib/utils';
import { subjects } from '@/db/schema';
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
    // Select subjects and count their usage in teacherClasses
    const subjectsWithClassCount = await db.select({
      id: subjects.id,
      schoolId: subjects.schoolId,
      name: subjects.name,
      code: subjects.code,
      description: subjects.description,
      weeklyHours: subjects.weeklyHours,
      createdAt: subjects.createdAt,
      updatedAt: subjects.updatedAt,
      classCount: sql<number>`count(${teacherClasses.id})`,
    })
    .from(subjects)
    .leftJoin(teacherClasses, eq(subjects.id, teacherClasses.subjectId))
    .groupBy(subjects.id)
    .having(sql`1=1`); // Placeholder, actual filtering will come below

    if (schoolId) {
      allSubjects = subjectsWithClassCount.filter(s => s.schoolId === schoolId);
    } else if (!isSuperAdmin(session.user.role) && session.user.schoolId) {
      allSubjects = subjectsWithClassCount.filter(s => s.schoolId === session.user.schoolId);
    } else {
      allSubjects = subjectsWithClassCount;
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
