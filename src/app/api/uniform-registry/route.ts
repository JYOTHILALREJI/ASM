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

// GET /api/uniform-registry - List all uniform registry entries (latest per employee)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const siteName = searchParams.get('siteName') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;
    const groupByEmployee = searchParams.get('groupByEmployee') !== 'false'; // default true

    // Build where clause - always exclude deleted records
    const where: Record<string, unknown> = { isDeleted: false };

    if (search) {
      const orConditions: Record<string, unknown>[] = [
        { employeeName: { contains: search, mode: 'insensitive' } },
      ];
      const tokenNum = parseInt(search, 10);
      if (!isNaN(tokenNum)) {
        orConditions.push({ tokenNumber: tokenNum });
        orConditions.push({ uniformId: tokenNum });
      }
      where.OR = orConditions;
    }

    if (siteName) {
      where.siteName = siteName;
    }

    if (groupByEmployee) {
      // Get latest entry per employee with record count
      // First get all non-deleted entries ordered by createdAt desc
      const allEntries = await db.uniformRegistry.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
      });

      // Group by employeeId, keeping only the latest entry and counting records
      const employeeMap = new Map<string, { entry: typeof allEntries[0]; recordCount: number }>();
      for (const entry of allEntries) {
        if (!employeeMap.has(entry.employeeId)) {
          employeeMap.set(entry.employeeId, { entry, recordCount: 1 });
        } else {
          employeeMap.get(entry.employeeId)!.recordCount++;
        }
      }

      // Convert to array and paginate
      const grouped = Array.from(employeeMap.values());
      const total = grouped.length;
      const paginated = grouped.slice(skip, skip + limit);

      const serialized = paginated.map(({ entry, recordCount }) => {
        const decrypted = decryptEntry({
          ...entry,
          createdAt: entry.createdAt.toISOString(),
          renewalDate: entry.renewalDate.toISOString(),
        });
        return { ...decrypted, recordCount };
      });

      return NextResponse.json({
        success: true,
        data: {
          entries: serialized,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } else {
      // Standard list (all entries)
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
                photo: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        db.uniformRegistry.count({ where }),
      ]);

      const serialized = entries.map((entry) =>
        decryptEntry({
          ...entry,
          createdAt: entry.createdAt.toISOString(),
          renewalDate: entry.renewalDate.toISOString(),
        })
      );

      return NextResponse.json({
        success: true,
        data: {
          entries: serialized,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }
  } catch (error) {
    console.error('[UNIFORM_REGISTRY_GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch uniform registry entries' },
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
      createdAt, // Allow custom creation date for adding previous data
      tokenNumber: customTokenNumber,
      uniformId: customUniformId,
    } = body;

    // Validate required fields
    if (!employeeName || !employeeId || !documentType || !documentNumber || !items) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: employeeName, employeeId, documentType, documentNumber, items' },
        { status: 400 }
      );
    }

    // Validate documentType
    if (!['id', 'passport'].includes(documentType)) {
      return NextResponse.json(
        { success: false, error: 'documentType must be "id" or "passport"' },
        { status: 400 }
      );
    }

    // Validate that the employee exists
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Auto-increment uniformId
    const maxUniformId = await db.uniformRegistry.findFirst({
      orderBy: { uniformId: 'desc' },
      select: { uniformId: true },
    });
    const uniformId = customUniformId || (maxUniformId?.uniformId ?? 0) + 1;

    // Auto-increment tokenNumber if not provided
    let tokenNumber: number;
    if (customTokenNumber) {
      tokenNumber = customTokenNumber;
    } else {
      const maxToken = await db.uniformRegistry.findFirst({
        orderBy: { tokenNumber: 'desc' },
        select: { tokenNumber: true },
      });
      tokenNumber = (maxToken?.tokenNumber ?? 0) + 1;
    }

    // Calculate renewalDate = createdAt + 6 months
    const createdDate = createdAt ? new Date(createdAt) : new Date();
    const renewalDate = new Date(createdDate);
    renewalDate.setMonth(renewalDate.getMonth() + 6);

    // Encrypt documentNumber
    const encryptedDocNumber = encrypt(documentNumber);

    const entry = await db.uniformRegistry.create({
      data: {
        uniformId,
        tokenNumber,
        employeeName,
        employeeId,
        documentType,
        documentNumber: encryptedDocNumber,
        items: typeof items === 'string' ? items : JSON.stringify(items),
        siteName: siteName || null,
        teamLeaderName: teamLeaderName || null,
        isRenewal: isRenewal ?? false,
        previousTokenId: previousTokenId || null,
        createdAt: createdDate,
        renewalDate,
      },
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

    return NextResponse.json(
      {
        success: true,
        data: {
          entry: decryptEntry({
            ...entry,
            createdAt: entry.createdAt.toISOString(),
            renewalDate: entry.renewalDate.toISOString(),
          }),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[UNIFORM_REGISTRY_POST]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create uniform registry entry' },
      { status: 500 }
    );
  }
}
