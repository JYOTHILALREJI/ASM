import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { requestedBy, reason } = body;

    if (!requestedBy) {
      return NextResponse.json(
        { success: false, error: 'requestedBy (user ID) is required' },
        { status: 400 }
      );
    }

    const employee = await db.employee.findUnique({ where: { id } });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    if (employee.status === 'deleted') {
      return NextResponse.json(
        { success: false, error: 'Employee is already deleted' },
        { status: 400 }
      );
    }

    if (employee.status === 'pending_deletion') {
      return NextResponse.json(
        { success: false, error: 'Employee already has a pending delete request' },
        { status: 400 }
      );
    }

    // Create delete request and update employee status in a transaction
    const deleteRequest = await db.$transaction(async (tx) => {
      const request = await tx.deleteRequest.create({
        data: {
          employeeId: id,
          requestedBy,
          reason: reason || null,
          status: 'pending',
        },
        include: {
          employee: {
            select: { fullName: true, employeeId: true },
          },
        },
      });

      // Update employee status
      await tx.employee.update({
        where: { id },
        data: { status: 'pending_deletion' },
      });

      return request;
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          deleteRequest: {
            ...deleteRequest,
            createdAt: deleteRequest.createdAt.toISOString(),
            updatedAt: deleteRequest.updatedAt.toISOString(),
          },
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('[Delete Request Error]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
