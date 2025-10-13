import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { timeSlotTemplates, classes, timeSlots } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { nanoid } from 'nanoid';

// Validation schema
const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
});

// GET /api/time-slot-templates - List all templates for school
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;
    
    // Only admins and superadmins can access templates
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get schoolId from query params (for superadmin) or use user's schoolId
    const { searchParams } = new URL(req.url);
    const schoolId = user.role === 'superadmin' 
      ? (searchParams.get('schoolId') || user.schoolId)
      : user.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    // Fetch all templates for the school with usage count
    const templates = await db
      .select({
        id: timeSlotTemplates.id,
        name: timeSlotTemplates.name,
        description: timeSlotTemplates.description,
        isDefault: timeSlotTemplates.isDefault,
        isActive: timeSlotTemplates.isActive,
        createdBy: timeSlotTemplates.createdBy,
        createdAt: timeSlotTemplates.createdAt,
        updatedAt: timeSlotTemplates.updatedAt,
      })
      .from(timeSlotTemplates)
      .where(eq(timeSlotTemplates.schoolId, schoolId))
      .orderBy(timeSlotTemplates.createdAt);

    // Get slot counts and class counts for each template
    const templatesWithStats = await Promise.all(
      templates.map(async (template) => {
        const slotCount = await db
          .select()
          .from(timeSlots)
          .where(eq(timeSlots.templateId, template.id));

        const classCount = await db
          .select()
          .from(classes)
          .where(eq(classes.timeSlotTemplateId, template.id));

        return {
          ...template,
          slotCount: slotCount.length,
          classCount: classCount.length,
        };
      })
    );

    return NextResponse.json({ templates: templatesWithStats });
  } catch (error) {
    console.error('Error fetching time slot templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time slot templates' },
      { status: 500 }
    );
  }
}

// POST /api/time-slot-templates - Create new template
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;
    
    // Only admins and superadmins can create templates
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!user.schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    const body = await req.json();
    const validated = createTemplateSchema.parse(body);

    // Check if template name already exists for this school
    const existingTemplate = await db
      .select()
      .from(timeSlotTemplates)
      .where(
        and(
          eq(timeSlotTemplates.schoolId, user.schoolId),
          eq(timeSlotTemplates.name, validated.name)
        )
      )
      .limit(1);

    if (existingTemplate.length > 0) {
      return NextResponse.json(
        { error: 'A template with this name already exists' },
        { status: 400 }
      );
    }

    // If this is marked as default, unset other defaults
    if (validated.isDefault) {
      await db
        .update(timeSlotTemplates)
        .set({ isDefault: false })
        .where(eq(timeSlotTemplates.schoolId, user.schoolId));
    }

    const now = new Date();
    const id = nanoid();

    const newTemplate = await db
      .insert(timeSlotTemplates)
      .values({
        id,
        schoolId: user.schoolId,
        name: validated.name,
        description: validated.description || null,
        isDefault: validated.isDefault || false,
        isActive: true,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json({ template: newTemplate[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating time slot template:', error);
    return NextResponse.json(
      { error: 'Failed to create time slot template' },
      { status: 500 }
    );
  }
}

