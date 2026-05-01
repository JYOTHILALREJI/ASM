import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/crypto';


// GET /api/uniform-registry - List all uniform registry entries

// Helper: decrypt sensitive fields on read
function decryptEmployee(employee: any) {
  if (employee.passportNumber) {
    try {
      employee.passportNumber = decrypt(employee.passportNumber);
    } catch {
      // ignore
    }
  }
  if (employee.idNumber) {
    try {
      employee.idNumber = decrypt(employee.idNumber);
    } catch {
      // ignore
    }
  }
  return employee;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const siteName = searchParams.get('siteName') || '';
    const type = searchParams.get('type') || 'active'; // 'active', 'expired', or 'all'
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const now = new Date();

    // Build where clause
    const where: Record<string, any> = {};

    if (search) {
      // 1. Find employees that match search in their decrypted fields (ID/Passport)
      // This is necessary because these fields are encrypted with random IV in the DB
      const allEmployees = await db.employee.findMany({
        where: { status: { not: 'deleted' } },
        select: { id: true, idNumber: true, passportNumber: true, employeeId: true, fullName: true }
      });

      const matchingEmployeeIds = allEmployees
        .map(emp => decryptEmployee(emp))
        .filter(emp => 
          (emp.idNumber && emp.idNumber.toLowerCase().includes(search.toLowerCase())) ||
          (emp.passportNumber && emp.passportNumber.toLowerCase().includes(search.toLowerCase())) ||
          (emp.fullName.toLowerCase().includes(search.toLowerCase())) ||
          (emp.employeeId.toLowerCase().includes(search.toLowerCase()))
        )
        .map(emp => emp.id);

      const orConditions: any[] = [
        { employeeName: { contains: search, mode: 'insensitive' } },
        { documentNumber: { contains: search, mode: 'insensitive' } },
        { siteName: { contains: search, mode: 'insensitive' } },
        {
          employee: {
            employeeId: { contains: search, mode: 'insensitive' },
          },
        },
      ];

      if (matchingEmployeeIds.length > 0) {
        orConditions.push({ employeeId: { in: matchingEmployeeIds } });
      }

      const tokenNum = parseInt(search, 10);
      if (!isNaN(tokenNum)) {
        orConditions.push({ tokenNumber: tokenNum });
      }
      where.OR = orConditions;
    }

    // Apply Active/Expired filter ONLY if not searching, or if explicitly requested
    // If searching, we show BOTH unless a type is explicitly forced to something other than 'all'
    const registryType = search ? (searchParams.get('type') || 'all') : type;
    
    // Always hide records for deleted employees
    where.employee = { status: { not: 'deleted' } };
    
    if (registryType === 'active') {
      where.renewalDate = { gt: now };
    } else if (registryType === 'expired') {
      where.renewalDate = { lte: now };
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
              photo: true,
              status: true,
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
      success: true,
      data: {
        entries: serialized,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
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
            photo: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          entry: {
            ...entry,
            createdAt: entry.createdAt.toISOString(),
            renewalDate: entry.renewalDate.toISOString(),
          },
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
