import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/crypto';

function decryptEmployee(employee: Record<string, unknown>) {
  if (employee.passportNumber) {
    employee.passportNumber = decrypt(employee.passportNumber as string);
  }
  if (employee.idNumber) {
    employee.idNumber = decrypt(employee.idNumber as string);
  }
  return employee;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        attendance: {
          orderBy: { date: 'desc' },
        },
        warnings: {
          orderBy: { createdAt: 'desc' },
        },
        fines: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const decrypted = decryptEmployee({
      ...employee,
      dateOfBirth: employee.dateOfBirth?.toISOString() || null,
      joinDate: employee.joinDate?.toISOString() || null,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
      attendance: employee.attendance.map((a: { createdAt: Date; updatedAt: Date }) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      warnings: employee.warnings.map((w: { createdAt: Date; updatedAt: Date }) => ({
        ...w,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      })),
      fines: employee.fines.map((f: { createdAt: Date; updatedAt: Date }) => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
    });

    return NextResponse.json({
      success: true,
      data: { employee: decrypted },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};

    const updatableFields = [
      'fullName', 'nationality', 'phone', 'email', 'address',
      'emergencyContact', 'position', 'companyName', 'passportStatus',
      'idStatus', 'currentSite', 'photo', 'status',
    ];

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    if (body.dateOfBirth) {
      data.dateOfBirth = new Date(body.dateOfBirth);
    }
    if (body.joinDate) {
      data.joinDate = new Date(body.joinDate);
    }
    if (body.rating !== undefined) {
      data.rating = body.rating;
    }

    // Encrypt sensitive fields
    if (body.passportNumber !== undefined) {
      data.passportNumber = body.passportNumber ? encrypt(body.passportNumber) : null;
    }
    if (body.idNumber !== undefined) {
      data.idNumber = body.idNumber ? encrypt(body.idNumber) : null;
    }

    const employee = await db.employee.update({
      where: { id },
      data: data as Parameters<typeof db.employee.update>[0]['data'],
    });

    const decrypted = decryptEmployee({
      ...employee,
      dateOfBirth: employee.dateOfBirth?.toISOString() || null,
      joinDate: employee.joinDate?.toISOString() || null,
      createdAt: employee.createdAt.toISOString(),
      updatedAt: employee.updatedAt.toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: { employee: decrypted },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    if (existing.status === 'pending_deletion') {
      return NextResponse.json(
        { success: false, error: 'Employee is pending deletion. Please use the delete request approval workflow.' },
        { status: 400 }
      );
    }

    const employee = await db.employee.update({
      where: { id },
      data: { status: 'deleted' },
    });

    return NextResponse.json({
      success: true,
      data: { employee: { id: employee.id, status: employee.status } },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
