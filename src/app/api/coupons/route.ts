import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { code, orderTotal } = await request.json();
    const coupon = await db.coupon.findUnique({ where: { code: code.toUpperCase() } });

    if (!coupon || !coupon.active) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 400 });
    }

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ error: 'Coupon usage limit reached' }, { status: 400 });
    }

    if (coupon.minOrder && orderTotal < coupon.minOrder) {
      return NextResponse.json(
        { error: `Minimum order of $${coupon.minOrder} required` },
        { status: 400 }
      );
    }

    let discount =
      coupon.type === 'percentage'
        ? (orderTotal * coupon.value) / 100
        : coupon.value;

    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }

    return NextResponse.json({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount: Math.round(discount * 100) / 100,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
