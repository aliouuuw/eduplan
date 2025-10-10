import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, generateId, getCurrentTimestamp } from '@/lib/db';
import { users } from '@/db/schema';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'teacher', 'parent', 'student']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, role } = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user (without schoolId for now - will be assigned by admin)
    const userId = generateId();
    const now = getCurrentTimestamp();

    await db.insert(users).values({
      id: userId,
      email,
      password: hashedPassword,
      name,
      role,
      schoolId: null, // Will be assigned by school admin
      isActive: role === 'admin', // Admins are active by default, others need approval
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      { 
        message: 'User created successfully',
        userId,
        requiresApproval: role !== 'admin'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid input data', errors: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
