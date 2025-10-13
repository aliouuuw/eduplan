import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { timeSlotTemplates, classes, timeSlots } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for update
const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').optional(),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/time-slot-templates/[id] - Get single template
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;

    // Only admins and superadmins can access templates
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!user.schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    const template = await db
      .select()
      .from(timeSlotTemplates)
      .where(
        and(
          eq(timeSlotTemplates.id, id),
          eq(timeSlotTemplates.schoolId, user.schoolId)
        )
      )
      .limit(1);

    if (template.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get slot count and class count
    const slotCount = await db
      .select()
      .from(timeSlots)
      .where(eq(timeSlots.templateId, id));

    const classCount = await db
      .select()
      .from(classes)
      .where(eq(classes.timeSlotTemplateId, id));

    return NextResponse.json({
      template: {
        ...template[0],
        slotCount: slotCount.length,
        classCount: classCount.length,
      },
    });
  } catch (error) {
    console.error('Error fetching time slot template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time slot template' },
      { status: 500 }
    );
  }
}

// PUT /api/time-slot-templates/[id] - Update template
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;

    // Only admins and superadmins can update templates
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!user.schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    // Verify template exists and belongs to school
    const existingTemplate = await db
      .select()
      .from(timeSlotTemplates)
      .where(
        and(
          eq(timeSlotTemplates.id, id),
          eq(timeSlotTemplates.schoolId, user.schoolId)
        )
      )
      .limit(1);

    if (existingTemplate.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const body = await req.json();
    const validated = updateTemplateSchema.parse(body);

    // If name is being changed, check for duplicates
    if (validated.name && validated.name !== existingTemplate[0].name) {
      const duplicateTemplate = await db
        .select()
        .from(timeSlotTemplates)
        .where(
          and(
            eq(timeSlotTemplates.schoolId, user.schoolId),
            eq(timeSlotTemplates.name, validated.name)
          )
        )
        .limit(1);

      if (duplicateTemplate.length > 0) {
        return NextResponse.json(
          { error: 'A template with this name already exists' },
          { status: 400 }
        );
      }
    }

    // If setting as default, unset other defaults
    if (validated.isDefault) {
      await db
        .update(timeSlotTemplates)
        .set({ isDefault: false })
        .where(
          and(
            eq(timeSlotTemplates.schoolId, user.schoolId),
            eq(timeSlotTemplates.isDefault, true)
          )
        );
    }

    const now = new Date();

    const updatedTemplate = await db
      .update(timeSlotTemplates)
      .set({
        ...validated,
        updatedAt: now,
      })
      .where(eq(timeSlotTemplates.id, id))
      .returning();

    return NextResponse.json({ template: updatedTemplate[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating time slot template:', error);
    return NextResponse.json(
      { error: 'Failed to update time slot template' },
      { status: 500 }
    );
  }
}

// DELETE /api/time-slot-templates/[id] - Delete template
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;

    // Only admins and superadmins can delete templates
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!user.schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    // Verify template exists and belongs to school
    const existingTemplate = await db
      .select()
      .from(timeSlotTemplates)
      .where(
        and(
          eq(timeSlotTemplates.id, id),
          eq(timeSlotTemplates.schoolId, user.schoolId)
        )
      )
      .limit(1);

    if (existingTemplate.length === 0) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check if any classes use this template
    const classesUsingTemplate = await db
      .select()
      .from(classes)
      .where(eq(classes.timeSlotTemplateId, id));

    if (classesUsingTemplate.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete template',
          message: `This template is currently used by ${classesUsingTemplate.length} class(es). Please reassign those classes to another template first.`,
        },
        { status: 400 }
      );
    }

    // Check if any time slots use this template
    const timeSlotsUsingTemplate = await db
      .select()
      .from(timeSlots)
      .where(eq(timeSlots.templateId, id));

    if (timeSlotsUsingTemplate.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete template',
          message: `This template has ${timeSlotsUsingTemplate.length} time slot(s) associated with it. Please delete or reassign those time slots first.`,
        },
        { status: 400 }
      );
    }

    // Check if this is the last template
    const allTemplates = await db
      .select()
      .from(timeSlotTemplates)
      .where(eq(timeSlotTemplates.schoolId, user.schoolId));

    if (allTemplates.length <= 1) {
      return NextResponse.json(
        {
          error: 'Cannot delete template',
          message: 'Cannot delete the last template. Schools must have at least one template.',
        },
        { status: 400 }
      );
    }

    // Delete the template
    await db
      .delete(timeSlotTemplates)
      .where(eq(timeSlotTemplates.id, id));

    return NextResponse.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting time slot template:', error);
    return NextResponse.json(
      { error: 'Failed to delete time slot template' },
      { status: 500 }
    );
  }
}

