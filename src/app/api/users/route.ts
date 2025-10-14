import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and, or, ne, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { db, getCurrentTimestamp } from '@/lib/db';
import { users } from '@/db/schema';
import { canAccessSchool, isSuperAdmin, isSchoolAdmin } from '@/lib/auth';
import { generateId } from '@/lib/utils';

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.enum(['admin', 'teacher', 'parent', 'student']),
  schoolId: z.string().optional(),
  isActive: z.boolean().default(true),
});

const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  schoolId: z.string().optional(),
  isActive: z.boolean().optional(),
  role: z.enum(['admin', 'teacher', 'parent', 'student']).optional(),
});

// GET /api/users - List users
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
    const role = searchParams.get('role');
    const pending = searchParams.get('pending') === 'true';

    // Build query conditions
    let conditions = [];

    // School filtering
    if (schoolId) {
      if (!canAccessSchool(session.user.role, session.user.schoolId, schoolId)) {
        return NextResponse.json(
          { message: 'Forbidden - Cannot access this school' },
          { status: 403 }
        );
      }
      conditions.push(eq(users.schoolId, schoolId));
    } else if (!isSuperAdmin(session.user.role) && session.user.schoolId) {
      // Non-superadmin users can only see users from their school
      conditions.push(eq(users.schoolId, session.user.schoolId));
    }

    // Role filtering
    if (role) {
      conditions.push(eq(users.role, role as any));
    }

    // Pending users (inactive users without schoolId)
    if (pending) {
      conditions.push(eq(users.isActive, false));
      conditions.push(isNull(users.schoolId));
    }

    // Exclude the current user from the results (admins shouldn't see themselves in the user list)
    if (session.user.id && !isSuperAdmin(session.user.role)) {
      conditions.push(ne(users.id, session.user.id));
    }

    // Exclude soft-deleted users (deletedAt is not null)
    conditions.push(isNull(users.deletedAt));

    let query = db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        schoolId: users.schoolId,
        isActive: users.isActive,
        deletedAt: users.deletedAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const allUsers = await query.orderBy(users.createdAt);

    return NextResponse.json({ users: allUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only superadmin and school admin can create users
    if (!isSuperAdmin(session.user.role) && !isSchoolAdmin(session.user.role)) {
      return NextResponse.json(
        { message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const userData = createUserSchema.parse(body);

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Determine schoolId
    let targetSchoolId: string | null = null;

    if (isSuperAdmin(session.user.role)) {
      // Superadmin can specify schoolId or use their own
      targetSchoolId = userData.schoolId || session.user.schoolId || null;
    } else {
      // School admin must assign to their school
      targetSchoolId = session.user.schoolId;

      if (userData.schoolId && userData.schoolId !== targetSchoolId) {
        return NextResponse.json(
          { message: 'Forbidden - Can only create users for your school' },
          { status: 403 }
        );
      }
    }

    // Generate password if not provided
    let hashedPassword: string;
    if (userData.password) {
      hashedPassword = await bcrypt.hash(userData.password, 12);
    } else {
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      hashedPassword = await bcrypt.hash(tempPassword, 12);
    }

    // Create user
    const userId = generateId();
    const now = getCurrentTimestamp();

    const newUser = await db.insert(users).values({
      id: userId,
      email: userData.email,
      password: hashedPassword,
      name: userData.name,
      role: userData.role,
      schoolId: targetSchoolId,
      isActive: userData.isActive,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: newUser[0].id,
          email: newUser[0].email,
          name: newUser[0].name,
          role: newUser[0].role,
          schoolId: newUser[0].schoolId,
          isActive: newUser[0].isActive,
          createdAt: newUser[0].createdAt,
        },
        tempPassword: userData.password ? undefined : 'A temporary password has been generated. Please inform the user to reset their password.'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);

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

// PUT /api/users - Update user (for approving users, assigning to schools, etc.)
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only superadmin and school admin can update users
    if (!isSuperAdmin(session.user.role) && !isSchoolAdmin(session.user.role)) {
      return NextResponse.json(
        { message: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updateData = updateUserSchema.parse(body);

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser.length) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const user = existingUser[0];

    // School admin can only update users in their school or assign pending users to their school
    if (isSchoolAdmin(session.user.role)) {
      if (updateData.schoolId && updateData.schoolId !== session.user.schoolId) {
        return NextResponse.json(
          { message: 'Forbidden - Can only assign users to your school' },
          { status: 403 }
        );
      }

      if (user.schoolId && user.schoolId !== session.user.schoolId) {
        return NextResponse.json(
          { message: 'Forbidden - Cannot update users from other schools' },
          { status: 403 }
        );
      }
    }

    // Update user
    const updatedUser = await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(users.id, userId))
      .returning();

    return NextResponse.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser[0].id,
        email: updatedUser[0].email,
        name: updatedUser[0].name,
        role: updatedUser[0].role,
        schoolId: updatedUser[0].schoolId,
        isActive: updatedUser[0].isActive,
        deletedAt: updatedUser[0].deletedAt,
        createdAt: updatedUser[0].createdAt,
        updatedAt: updatedUser[0].updatedAt,
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);

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

// DELETE /api/users?userId=xxx - Delete/deactivate a user
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only superadmin can delete users
    if (!isSuperAdmin(session.user.role)) {
      return NextResponse.json(
        { message: 'Forbidden - Superadmin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser.length) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const user = existingUser[0];

    // Prevent deleting superadmin users
    if (user.role === 'superadmin') {
      return NextResponse.json(
        { message: 'Cannot delete superadmin users' },
        { status: 403 }
      );
    }

    // Soft delete by setting deletedAt timestamp
    await db
      .update(users)
      .set({
        deletedAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      })
      .where(eq(users.id, userId));

    return NextResponse.json({
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}