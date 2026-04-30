import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Uniform registry entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        entry: {
          ...entry,
          createdAt: entry.createdAt.toISOString(),
          renewalDate: entry.renewalDate.toISOString(),
        },
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

// PUT /api/uniform-registry/[id] - Update a uniform registry entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Check if entry exists
    const existing = await db.uniformRegistry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Uniform registry entry not found' },
        { status: 404 }
      );
    }

    // Only allow updating specific fields
    const updateData: Record<string, unknown> = {};
    if (body.items !== undefined) {
      updateData.items = typeof body.items === 'string' ? body.items : JSON.stringify(body.items);
    }
    if (body.siteName !== undefined) {
      updateData.siteName = body.siteName;
    }
    if (body.teamLeaderName !== undefined) {
      updateData.teamLeaderName = body.teamLeaderName;
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
        entry: {
          ...entry,
          createdAt: entry.createdAt.toISOString(),
          renewalDate: entry.renewalDate.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('[UNIFORM_REGISTRY_PUT]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update uniform registry entry' },
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
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Uniform registry entry not found' },
        { status: 404 }
      );
    }

    await db.uniformRegistry.delete({ where: { id } });

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
