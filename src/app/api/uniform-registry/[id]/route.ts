import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';

// Helper: decrypt documentNumber for display
function decryptEntry(entry: Record<string, unknown>) {
  if (entry.documentNumber) {
    entry.documentNumber = decrypt(entry.documentNumber as string);
  }
  return entry;
}

// GET /api/uniform-registry/[id] - Get single uniform registry entry
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const entry = await db.uniformRegistry.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            isTeamLeader: true,
            currentSite: true,
            photo: true,
          },
        },
      },
    });

    if (!entry || entry.isDeleted) {
      return NextResponse.json(
        { success: false, error: 'Uniform registry entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        entry: decryptEntry({
          ...entry,
          createdAt: entry.createdAt.toISOString(),
          renewalDate: entry.renewalDate.toISOString(),
        }),
      },
    });
  } catch (error) {
    console.error('[UNIFORM_REGISTRY_GET_BY_ID]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch uniform registry entry' },
      { status: 500 }
    );
  }
}

// PUT /api/uniform-registry/[id] - Update a uniform registry entry (all fields editable)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if entry exists
    const existing = await db.uniformRegistry.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) {
      return NextResponse.json(
        { success: false, error: 'Uniform registry entry not found' },
        { status: 404 }
      );
    }

    // Build update data - all fields are editable
    const updateData: Record<string, unknown> = {};

    if (body.tokenNumber !== undefined) {
      updateData.tokenNumber = parseInt(body.tokenNumber, 10);
    }
    if (body.uniformId !== undefined) {
      updateData.uniformId = parseInt(body.uniformId, 10);
    }
    if (body.employeeName !== undefined) {
      updateData.employeeName = body.employeeName;
    }
    if (body.documentType !== undefined) {
      updateData.documentType = body.documentType;
    }
    if (body.documentNumber !== undefined) {
      // Encrypt documentNumber
      updateData.documentNumber = encrypt(body.documentNumber);
    }
    if (body.items !== undefined) {
      updateData.items = typeof body.items === 'string' ? body.items : JSON.stringify(body.items);
    }
    if (body.siteName !== undefined) {
      updateData.siteName = body.siteName || null;
    }
    if (body.teamLeaderName !== undefined) {
      updateData.teamLeaderName = body.teamLeaderName || null;
    }

    // If createdAt is being changed, recalculate renewalDate (6 months from new createdAt)
    if (body.createdAt !== undefined) {
      const newCreatedDate = new Date(body.createdAt);
      updateData.createdAt = newCreatedDate;
      const newRenewalDate = new Date(newCreatedDate);
      newRenewalDate.setMonth(newRenewalDate.getMonth() + 6);
      updateData.renewalDate = newRenewalDate;
    }

    const entry = await db.uniformRegistry.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            isTeamLeader: true,
            currentSite: true,
            photo: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        entry: decryptEntry({
          ...entry,
          createdAt: entry.createdAt.toISOString(),
          renewalDate: entry.renewalDate.toISOString(),
        }),
      },
    });
  } catch (error) {
    console.error('[UNIFORM_REGISTRY_PUT]', error);
    const message = error instanceof Error ? error.message : 'Failed to update uniform registry entry';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// DELETE /api/uniform-registry/[id] - Delete a uniform registry entry
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if entry exists
    const existing = await db.uniformRegistry.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) {
      return NextResponse.json(
        { success: false, error: 'Uniform registry entry not found' },
        { status: 404 }
      );
    }

    // Soft delete - mark as deleted instead of removing from database
    await db.uniformRegistry.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Uniform registry entry deleted successfully' },
    });
  } catch (error) {
    console.error('[UNIFORM_REGISTRY_DELETE]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete uniform registry entry' },
      { status: 500 }
    );
  }
}
