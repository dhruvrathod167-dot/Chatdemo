import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const featured = searchParams.get('featured');
  const newArrival = searchParams.get('newArrival');
  const bestSeller = searchParams.get('bestSeller');
  const trending = searchParams.get('trending');
  const category = searchParams.get('category');
  const brand = searchParams.get('brand');
  const search = searchParams.get('search');
  const sort = searchParams.get('sort') || 'createdAt';
  const limit = parseInt(searchParams.get('limit') || '20');
  const page = parseInt(searchParams.get('page') || '1');
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { status: 'active' };
  if (featured === 'true') where.featured = true;
  if (newArrival === 'true') where.newArrival = true;
  if (bestSeller === 'true') where.bestSeller = true;
  if (trending === 'true') where.trending = true;
  if (category) where.categoryId = category;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
      { tags: { contains: search } },
    ];
  }

  const orderBy: Record<string, string> = {};
  if (sort === 'price-asc') orderBy.price = 'asc';
  else if (sort === 'price-desc') orderBy.price = 'desc';
  else if (sort === 'rating') orderBy.rating = 'desc';
  else if (sort === 'name') orderBy.name = 'asc';
  else orderBy.createdAt = 'desc';

  try {
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: { select: { name: true, slug: true } },
          brand: { select: { name: true, slug: true, country: true } },
        },
      }),
      db.product.count({ where }),
    ]);

    const formatted = products.map((p) => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
      sizes: JSON.parse(p.sizes || '[]'),
      colors: JSON.parse(p.colors || '[]'),
      tags: JSON.parse(p.tags || '[]'),
    }));

    return NextResponse.json({
      products: formatted,
      total,
      pages: Math.ceil(total / limit),
      page,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
