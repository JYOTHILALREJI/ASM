import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        admin: {
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      },
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
    const { name, email, password } = body;

    const existing = await db.user.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    if (existing.role === 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Cannot update super admin through this endpoint' },
        { status: 403 }
      );
    }

    const data: Record<string, unknown> = {};

    if (name !== undefined) {
      data.name = name;
    }

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        );
      }

      // Check uniqueness
      const emailExists = await db.user.findFirst({
        where: {
          email: email.toLowerCase(),
          NOT: { id },
        },
      });

      if (emailExists) {
        return NextResponse.json(
          { success: false, error: 'A user with this email already exists' },
          { status: 409 }
        );
      }

      data.email = email.toLowerCase();
    }

    if (password !== undefined && password.length > 0) {
      data.password = await hashPassword(password);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const user = await db.user.update({
      where: { id },
      data: data as Parameters<typeof db.user.update>[0]['data'],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        admin: {
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      },
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

    const existing = await db.user.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    if (existing.role === 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete super admin' },
        { status: 403 }
      );
    }

    await db.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      data: { message: 'Admin deleted successfully' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
