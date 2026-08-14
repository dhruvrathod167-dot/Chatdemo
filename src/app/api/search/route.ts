import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const products = await db.product.findMany({
      where: {
        status: 'active',
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
          { tags: { contains: q } },
          { material: { contains: q } },
        ],
      },
      take: 12,
      include: {
        category: { select: { name: true, slug: true } },
        brand: { select: { name: true } },
      },
    });

    const formatted = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      image: JSON.parse(p.images || '[]')[0],
      category: p.category?.name,
      brand: p.brand?.name,
    }));

    return NextResponse.json({ results: formatted });
  } catch {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
