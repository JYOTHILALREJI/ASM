import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/crypto';

// Helper: decrypt documentNumber for display
function decryptEntry(entry: Record<string, unknown>) {
  if (entry.documentNumber) {
    entry.documentNumber = decrypt(entry.documentNumber as string);
  }
  return entry;
}

// GET /api/uniform-registry/employee/[employeeId] - Fetch all entries for a specific employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params;

    const entries = await db.uniformRegistry.findMany({
      where: {
        employeeId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
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

    const serialized = entries.map((entry) =>
      decryptEntry({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
        renewalDate: entry.renewalDate.toISOString(),
      })
    );

    return NextResponse.json({
      success: true,
      data: { entries: serialized },
    });
  } catch (error) {
    console.error('[UNIFORM_REGISTRY_BY_EMPLOYEE]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch entries' },
      { status: 500 }
    );
  }
}
