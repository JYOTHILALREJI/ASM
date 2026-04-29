import { NextRequest } from 'next/server';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // ... update status (approve/reject) + set reviewedBy, reviewedAt
}