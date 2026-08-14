import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const product = await db.product.findUnique({
      where: { slug },
      include: {
        category: true,
        brand: true,
        reviews: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const related = await db.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        status: 'active',
      },
      take: 8,
      include: {
        category: { select: { name: true, slug: true } },
        brand: { select: { name: true, slug: true } },
      },
    });

    const formatProduct = (p: typeof product) => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
      sizes: JSON.parse(p.sizes || '[]'),
      colors: JSON.parse(p.colors || '[]'),
      tags: JSON.parse(p.tags || '[]'),
    });

    return NextResponse.json({
      product: formatProduct(product),
      related: related.map(formatProduct),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
