import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db, generateId, getCurrentTimestamp } from '@/lib/db';
import { schools } from '@/db/schema';
import { isSuperAdmin } from '@/lib/auth';

const createSchoolSchema = z.object({
  name: z.string().min(2, 'School name must be at least 2 characters'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  logo: z.string().url().optional(),
});

// GET /api/schools - List all schools (superadmin only)
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user || !isSuperAdmin(session.user.role)) {
      return NextResponse.json(
        { message: 'Unauthorized - Superadmin access required' },
        { status: 403 }
      );
    }

    const allSchools = await db
      .select()
      .from(schools)
      .orderBy(schools.createdAt);

    return NextResponse.json({ schools: allSchools });
  } catch (error) {
    console.error('Error fetching schools:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/schools - Create new school (superadmin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || !isSuperAdmin(session.user.role)) {
      return NextResponse.json(
        { message: 'Unauthorized - Superadmin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, address, phone, email, logo } = createSchoolSchema.parse(body);

    // Check if school with same name exists
    const existingSchool = await db
      .select()
      .from(schools)
      .where(eq(schools.name, name))
      .limit(1);

    if (existingSchool.length > 0) {
      return NextResponse.json(
        { message: 'School with this name already exists' },
        { status: 400 }
      );
    }

    const schoolId = generateId();
    const now = getCurrentTimestamp();

    const newSchool = await db.insert(schools).values({
      id: schoolId,
      name,
      address: address || null,
      phone: phone || null,
      email: email || null,
      logo: logo || null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json(
      { 
        message: 'School created successfully',
        school: newSchool[0]
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating school:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid input data', errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
