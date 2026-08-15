import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const testimonials = await db.testimonial.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(testimonials);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
