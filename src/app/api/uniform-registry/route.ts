import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/uniform-registry - List all uniform registry entries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const siteName = searchParams.get('siteName') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { employeeName: { contains: search } },
        { documentNumber: { contains: search } },
        { tokenNumber: isNaN(Number(search)) ? undefined : Number(search) },
      ].filter(Boolean);
    }

    if (siteName) {
      where.siteName = siteName;
    }

    const [entries, total] = await Promise.all([
      db.uniformRegistry.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              fullName: true,
              isTeamLeader: true,
              currentSite: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.uniformRegistry.count({ where }),
    ]);

    // Serialize dates as ISO strings
    const serialized = entries.map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
      renewalDate: entry.renewalDate.toISOString(),
    }));

    return NextResponse.json({
      data: serialized,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[UNIFORM_REGISTRY_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch uniform registry entries' },
      { status: 500 }
    );
  }
}

// POST /api/uniform-registry - Create a new uniform registry entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employeeName,
      employeeId,
      documentType,
      documentNumber,
      items,
      siteName,
      teamLeaderName,
      isRenewal,
      previousTokenId,
    } = body;

    // Validate required fields
    if (!employeeName || !employeeId || !documentType || !documentNumber || !items) {
      return NextResponse.json(
        { error: 'Missing required fields: employeeName, employeeId, documentType, documentNumber, items' },
        { status: 400 }
      );
    }

    // Validate documentType
    if (!['id', 'passport'].includes(documentType)) {
      return NextResponse.json(
        { error: 'documentType must be "id" or "passport"' },
        { status: 400 }
      );
    }

    // Validate that the employee exists
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Auto-increment tokenNumber: find max tokenNumber and add 1
    const maxToken = await db.uniformRegistry.findFirst({
      orderBy: { tokenNumber: 'desc' },
      select: { tokenNumber: true },
    });
    const tokenNumber = (maxToken?.tokenNumber ?? 0) + 1;

    // Calculate renewalDate = createdAt + 6 months
    const now = new Date();
    const renewalDate = new Date(now);
    renewalDate.setMonth(renewalDate.getMonth() + 6);

    const entry = await db.uniformRegistry.create({
      data: {
        tokenNumber,
        employeeName,
        employeeId,
        documentType,
        documentNumber,
        items: typeof items === 'string' ? items : JSON.stringify(items),
        siteName: siteName || null,
        teamLeaderName: teamLeaderName || null,
        isRenewal: isRenewal ?? false,
        previousTokenId: previousTokenId || null,
        renewalDate,
      },
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            isTeamLeader: true,
            currentSite: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        ...entry,
        createdAt: entry.createdAt.toISOString(),
        renewalDate: entry.renewalDate.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[UNIFORM_REGISTRY_POST]', error);
    return NextResponse.json(
      { error: 'Failed to create uniform registry entry' },
      { status: 500 }
    );
  }
}
