import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  { name: 'Women', slug: 'women', featured: true, sortOrder: 1, description: 'Luxury womenswear collections' },
  { name: 'Men', slug: 'men', featured: true, sortOrder: 2, description: 'Premium menswear collections' },
  { name: 'Accessories', slug: 'accessories', featured: true, sortOrder: 3, description: 'Designer accessories' },
  { name: 'Shoes', slug: 'shoes', featured: true, sortOrder: 4, description: 'Luxury footwear' },
  { name: 'Bags', slug: 'bags', featured: true, sortOrder: 5, description: 'Designer handbags and luggage' },
  { name: 'Jewelry', slug: 'jewelry', featured: false, sortOrder: 6, description: 'Fine jewelry and watches' },
  { name: 'Fragrances', slug: 'fragrances', featured: false, sortOrder: 7, description: 'Luxury perfumes and colognes' },
  { name: 'Ready-to-Wear', slug: 'ready-to-wear', featured: false, sortOrder: 8, description: 'Ready-to-wear collections' },
];

const brands = [
  { name: 'Maison Étoile', slug: 'maison-etoile', description: 'Parisian haute couture house specializing in architectural silhouettes and avant-garde luxury fashion since 1947.', country: 'France', founded: 1947, featured: true },
  { name: 'Atelier Noir', slug: 'atelier-noir', description: 'Milan-based atelier renowned for its minimalist aesthetic and exceptional leather craftsmanship.', country: 'Italy', founded: 1962, featured: true },
  { name: 'Voss & Klein', slug: 'voss-klein', description: 'Berlin-Stockholm design duo known for deconstructed luxury and sustainable materials.', country: 'Germany', founded: 2001, featured: true },
  { name: 'Casa de Luxo', slug: 'casa-de-luxo', description: 'Brazilian luxury brand celebrating vibrant culture through refined, cosmopolitan design.', country: 'Brazil', founded: 1988, featured: true },
  { name: 'Sakura Hana', slug: 'sakura-hana', description: 'Tokyo-based maison blending traditional Japanese artisanship with contemporary fashion.', country: 'Japan', founded: 1975, featured: true },
  { name: 'Royal Heritage', slug: 'royal-heritage', description: 'London heritage brand supplying British royalty with bespoke tailoring since 1892.', country: 'United Kingdom', founded: 1892, featured: false },
  { name: 'Nordic Luxe', slug: 'nordic-luxe', description: 'Copenhagen label pioneering Scandinavian minimalism in luxury fashion.', country: 'Denmark', founded: 2008, featured: false },
  { name: 'Atelier Lumière', slug: 'atelier-lumiere', description: 'New York atelier celebrated for its evening wear and red carpet creations.', country: 'United States', founded: 1995, featured: false },
];

const products = [
  // Women - Featured
  { name: 'Silk Drape Evening Gown', slug: 'silk-drape-evening-gown', description: 'An exquisite floor-length gown crafted from double-faced silk crêpe, featuring an asymmetric drape neckline and a sculptural pleated back. Each piece requires over 40 hours of hand-finishing by our master artisans in the Paris atelier. The fluid silhouette moves with effortless grace, making it the definitive choice for galas and premieres.', shortDesc: 'Hand-finished silk crêpe evening gown', price: 4850, comparePrice: 5800, categoryId: 'women', brandSlug: 'maison-etoile', sizes: '["XS","S","M","L"]', colors: '["Noir","Ivory","Burgundy"]', material: '100% Silk Crêpe', care: 'Dry clean only. Store on padded hanger.', featured: true, newArrival: true, bestSeller: true, trending: true, stock: 12, rating: 4.9, reviewCount: 47, tags: '["gown","evening","silk","luxury","red-carpet"]' },
  { name: 'Tailored Wool Blazer', slug: 'tailored-wool-blazer', description: 'Impeccably tailored from Italian virgin wool with a half-canvas construction, this double-breasted blazer features peak lapels, horn buttons, and a perfect silhouette that transitions effortlessly from boardroom to evening. The interior is fully lined with Bemberg lining for comfort and drape.', shortDesc: 'Italian virgin wool double-breasted blazer', price: 2200, comparePrice: null, categoryId: 'women', brandSlug: 'royal-heritage', sizes: '["34","36","38","40","42","44"]', colors: '["Charcoal","Navy","Camel"]', material: '100% Virgin Wool', care: 'Professional dry clean recommended', featured: true, newArrival: false, bestSeller: true, trending: false, stock: 25, rating: 4.8, reviewCount: 132, tags: '["blazer","tailored","wool","professional"]' },
  { name: 'Leather Sculptural Heel', slug: 'leather-sculptural-heel', description: 'A masterwork of footwear engineering, these sculptural heels are carved from a single block of Italian calfskin leather. The 85mm heel is wrapped in matching nappa leather, while the insole features our signature memory-foam cushioning. Each pair is hand-lasted and requires 28 individual steps to complete.', shortDesc: 'Hand-lasted Italian calfskin sculptural heels', price: 1450, comparePrice: 1720, categoryId: 'shoes', brandSlug: 'atelier-noir', sizes: '["36","37","38","39","40","41"]', colors: '["Black","Cognac","Bordeaux"]', material: 'Italian Calfskin Leather', care: 'Store with shoe trees. Polish with soft cloth.', featured: true, newArrival: true, bestSeller: false, trending: true, stock: 18, rating: 4.7, reviewCount: 63, tags: '["heels","leather","sculptural","italian"]' },
  { name: 'Cashmere Wrap Coat', slug: 'cashmere-wrap-coat', description: 'This oversized wrap coat is spun from the finest Grade-A Mongolian cashmere, featuring a belted waist, notched collar, and hand-finished seams. The generous proportions create a dramatic silhouette while the lightweight cashmere ensures exceptional warmth without bulk. A timeless investment piece.', shortDesc: 'Grade-A Mongolian cashmere oversized wrap coat', price: 3800, comparePrice: 4500, categoryId: 'women', brandSlug: 'nordic-luxe', sizes: '["XS","S","M","L","XL"]', colors: '["Oatmeal","Charcoal","Camel","Navy"]', material: '100% Grade-A Mongolian Cashmere', care: 'Dry clean only. Fold for storage.', featured: true, newArrival: false, bestSeller: true, trending: true, stock: 8, rating: 4.9, reviewCount: 89, tags: '["coat","cashmere","wrap","winter","luxury"]' },
  { name: 'Quilted Chain Shoulder Bag', slug: 'quilted-chain-shoulder-bag', description: 'The iconic quilted shoulder bag reimagined with a modern chain detail. Crafted from buttery-soft lambskin leather with signature diamond quilting, gold-tone hardware, and a suede-lined interior with multiple compartments. Each bag is hand-stitched by a single artisan over 18 hours.', shortDesc: 'Quilted lambskin leather shoulder bag with chain', price: 3200, comparePrice: null, categoryId: 'bags', brandSlug: 'atelier-noir', sizes: '["One Size"]', colors: '["Black","Cream","Rose","Red"]', material: 'Lambskin Leather', care: 'Store in dust bag. Avoid direct sunlight.', featured: true, newArrival: true, bestSeller: true, trending: true, stock: 15, rating: 4.8, reviewCount: 204, tags: '["bag","quilted","chain","leather","iconic"]' },
  // Men - Featured
  { name: 'Structured Double-Breasted Suit', slug: 'structured-double-breasted-suit', description: 'A masterclass in sartorial excellence, this double-breasted suit is cut from Super 150s wool from the Biella mills of Italy. Featuring a peak lapel, surgeon cuffs, and a floating canvas construction that molds to the body over time. The trousers feature a flat front and hand-finished buttonholes.', shortDesc: 'Super 150s Italian wool double-breasted suit', price: 4200, comparePrice: 5000, categoryId: 'men', brandSlug: 'royal-heritage', sizes: '["46","48","50","52","54","56"]', colors: '["Midnight Navy","Charcoal","Slate"]', material: 'Super 150s Merino Wool', care: 'Professional dry clean only', featured: true, newArrival: false, bestSeller: true, trending: false, stock: 10, rating: 4.9, reviewCount: 76, tags: '["suit","double-breasted","italian-wool","bespoke"]' },
  { name: 'Minimalist Leather Sneakers', slug: 'minimalist-leather-sneakers', description: 'Stripped to its essential elements, this sneaker is crafted from a single piece of full-grain leather with a hand-stitched margom sole. The minimalist upper features hidden elastic gore for a sock-like fit, while the interior is lined with breathable leather. A modern classic that elevates any casual ensemble.', shortDesc: 'Full-grain leather minimalist sneakers', price: 680, comparePrice: 820, categoryId: 'shoes', brandSlug: 'voss-klein', sizes: '["40","41","42","43","44","45"]', colors: '["White","Black","Sand"]', material: 'Full-Grain Leather', care: 'Wipe with damp cloth. Use leather conditioner.', featured: true, newArrival: true, bestSeller: true, trending: true, stock: 30, rating: 4.7, reviewCount: 312, tags: '["sneakers","leather","minimalist","casual"]' },
  { name: 'Deconstructed Linen Shirt', slug: 'deconstructed-linen-shirt', description: 'This deconstructed shirt redefines casual luxury with its raw-edge details, oversized proportions, and premium Belgian linen. The buttons are crafted from natural corozo nut, and the seams are intentionally exposed as a design element. Each piece develops a unique patina with wear.', shortDesc: 'Belgian linen deconstructed oversized shirt', price: 520, comparePrice: null, categoryId: 'men', brandSlug: 'voss-klein', sizes: '["S","M","L","XL"]', colors: '["Natural","Black","Sage","Dusty Rose"]', material: '100% Belgian Linen', care: 'Machine wash cold. Tumble dry low.', featured: true, newArrival: true, bestSeller: false, trending: true, stock: 22, rating: 4.6, reviewCount: 94, tags: '["shirt","linen","deconstructed","oversized"]' },
  // Accessories
  { name: 'Heritage Silk Scarf', slug: 'heritage-silk-scarf', description: 'This oversized silk twill scarf features an original hand-drawn motif inspired by Art Deco architecture. Printed using traditional screen techniques on the finest Como silk, each color requires a separate pass. The hand-rolled edges are finished by artisans in our Italian workshop.', shortDesc: 'Hand-printed Como silk twill scarf', price: 480, comparePrice: 580, categoryId: 'accessories', brandSlug: 'maison-etoile', sizes: '["One Size"]', colors: '["Noir/Gold","Navy/Ivory","Burgundy/Cream"]', material: '100% Silk Twill', care: 'Dry clean only', featured: true, newArrival: false, bestSeller: true, trending: false, stock: 40, rating: 4.8, reviewCount: 156, tags: '["scarf","silk","art-deco","printed"]' },
  { name: 'Ceramic Chronograph Watch', slug: 'ceramic-chronograph-watch', description: 'A feat of horological engineering, this chronograph features a scratch-resistant ceramic case, sapphire crystal, and Swiss automatic movement with 72-hour power reserve. The dial is hand-finished with a guilloché pattern, and the strap is crafted from hand-stitched alligator leather.', shortDesc: 'Swiss ceramic chronograph with automatic movement', price: 12500, comparePrice: 15000, categoryId: 'jewelry', brandSlug: 'sakura-hana', sizes: '["One Size"]', colors: '["Black","White","Rose Gold"]', material: 'High-Tech Ceramic', care: 'Service every 3-5 years', featured: true, newArrival: true, bestSeller: false, trending: true, stock: 5, rating: 5.0, reviewCount: 28, tags: '["watch","chronograph","ceramic","swiss","luxury"]' },
  { name: 'Leather Tote Bag', slug: 'leather-tote-bag', description: 'The definitive everyday luxury tote, crafted from vegetable-tanned Florentine leather that develops a rich patina over time. Features a spacious interior with suede lining, internal zip pocket, and magnetic closure. The reinforced handles ensure durability while maintaining an elegant profile.', shortDesc: 'Vegetable-tanned Florentine leather tote', price: 2800, comparePrice: 3400, categoryId: 'bags', brandSlug: 'atelier-noir', sizes: '["One Size"]', colors: '["Cognac","Black","Tan","Burgundy"]', material: 'Vegetable-Tanned Calf Leather', care: 'Condition with leather balm. Store in dust bag.', featured: true, newArrival: false, bestSeller: true, trending: true, stock: 20, rating: 4.8, reviewCount: 187, tags: '["tote","leather","florentine","everyday"]' },
  // More products for variety
  { name: 'Embroidered Silk Kimono Jacket', slug: 'embroidered-silk-kimono-jacket', description: 'This stunning kimono jacket features hand-embroidered cherry blossoms on luminous silk satin. Each embroidery panel takes over 200 hours to complete by our Kyoto artisans. The relaxed, flowing silhouette layers beautifully over dresses or trousers for an effortless evening look.', shortDesc: 'Hand-embroidered cherry blossom silk kimono jacket', price: 6800, comparePrice: 8200, categoryId: 'women', brandSlug: 'sakura-hana', sizes: '["XS","S","M","L"]', colors: '["Ivory/Blush","Noir/Gold","Midnight/Navy"]', material: 'Silk Satin', care: 'Dry clean only. Store flat.', featured: false, newArrival: true, bestSeller: false, trending: true, stock: 6, rating: 4.9, reviewCount: 23, tags: '["kimono","embroidered","silk","japanese","evening"]' },
  { name: 'Ribbed Cashmere Turtleneck', slug: 'ribbed-cashmere-turtleneck', description: 'Knitted from 2-ply Scottish cashmere in a refined ribbed stitch, this turtleneck is the cornerstone of a luxury wardrobe. The relaxed fit sits perfectly at the hip, while the rolled neckline provides a clean, architectural line. An everyday essential that elevates any outfit.', shortDesc: '2-ply Scottish cashmere ribbed turtleneck', price: 890, comparePrice: 1050, categoryId: 'men', brandSlug: 'nordic-luxe', sizes: '["S","M","L","XL","XXL"]', colors: '["Black","Ivory","Camel","Navy","Grey"]', material: '100% Scottish Cashmere', care: 'Hand wash cold. Lay flat to dry.', featured: false, newArrival: false, bestSeller: true, trending: false, stock: 35, rating: 4.7, reviewCount: 267, tags: '["turtleneck","cashmere","ribbed","essential"]' },
  { name: 'Satin Draped Midi Dress', slug: 'satin-draped-midi-dress', description: 'A vision of understated glamour, this midi dress is cut from heavyweight silk satin with an expertly draped bodice and a bias-cut skirt that cascades to the calf. The hidden side seam zip ensures a flawless fit, while the low back adds a note of contemporary allure.', shortDesc: 'Heavyweight silk satin draped midi dress', price: 2650, comparePrice: 3100, categoryId: 'women', brandSlug: 'casa-de-luxo', sizes: '["XS","S","M","L"]', colors: '["Champagne","Black","Emerald","Ruby"]', material: 'Silk Satin', care: 'Dry clean only', featured: false, newArrival: true, bestSeller: false, trending: true, stock: 14, rating: 4.8, reviewCount: 58, tags: '["dress","satin","draped","midi","evening"]' },
  { name: 'Woven Leather Belt', slug: 'woven-leather-belt', description: 'Hand-woven from strips of hand-dyed Italian calfskin, this belt features a brushed palladium buckle with our discreet logo engraving. The intricate weaving technique ensures flexibility while maintaining structure. A refined finishing touch for any ensemble.', shortDesc: 'Hand-woven Italian calfskin leather belt', price: 420, comparePrice: null, categoryId: 'accessories', brandSlug: 'atelier-noir', sizes: '["80","85","90","95","100","105"]', colors: '["Black","Cognac","Tan"]', material: 'Italian Calfskin Leather', care: 'Wipe with soft cloth. Condition annually.', featured: false, newArrival: false, bestSeller: true, trending: false, stock: 50, rating: 4.6, reviewCount: 341, tags: '["belt","woven","leather","italian","accessory"]' },
  { name: 'Oversized Sunglasses', slug: 'oversized-sunglasses', description: 'Statement oversized frames handcrafted from bio-acetate derived from cotton and wood pulp. The polarized lenses provide 100% UV protection with anti-reflective coating. Each pair comes with a hand-stitched leather case and microfiber cloth.', shortDesc: 'Bio-acetate oversized polarized sunglasses', price: 380, comparePrice: 450, categoryId: 'accessories', brandSlug: 'voss-klein', sizes: '["One Size"]', colors: '["Tortoise/Green","Black/Grey","Crystal/Brown"]', material: 'Bio-Acetate', care: 'Clean with microfiber cloth. Store in case.', featured: false, newArrival: true, bestSeller: true, trending: true, stock: 45, rating: 4.5, reviewCount: 423, tags: '["sunglasses","oversized","polarized","eco"]' },
  { name: 'Leather Weekend Bag', slug: 'leather-weekend-bag', description: 'The perfect companion for refined travel, this weekender is crafted from full-grain bridle leather with brass hardware. Features a spacious main compartment, detachable shoulder strap, and external pockets. The cotton twill lining and interior straps keep garments in place during transit.', shortDesc: 'Full-grain bridle leather weekend travel bag', price: 3500, comparePrice: 4200, categoryId: 'bags', brandSlug: 'royal-heritage', sizes: '["One Size"]', colors: '["Dark Brown","Black","Tan"]', material: 'Full-Grain Bridle Leather', care: 'Condition with leather cream. Store stuffed.', featured: false, newArrival: false, bestSeller: true, trending: false, stock: 11, rating: 4.9, reviewCount: 92, tags: '["weekender","travel","leather","bridle"]' },
];

const testimonials = [
  { name: 'Isabella Fontaine', title: 'Creative Director, Vogue Paris', comment: 'The attention to detail is extraordinary. Each piece feels like it was made specifically for me. The craftsmanship rivals the finest maisons in Paris, yet the design feels completely contemporary and fresh. This is what modern luxury should be.', rating: 5, featured: true, sortOrder: 1 },
  { name: 'Alexander Chen', title: 'CEO, Meridian Capital', comment: 'I have been a client of luxury fashion for over two decades, and the quality here stands apart. The Super 150s wool suit I purchased has become my signature piece. The fit is impeccable, and the fabric drapes like no other.', rating: 5, featured: true, sortOrder: 2 },
  { name: 'Sofia Andersson', title: 'Architect & Style Icon', comment: 'Minimalism executed at its absolute finest. The leather sneakers and deconstructed shirt from Voss & Klein have become my daily uniform. The quality is evident in every stitch, every seam, every carefully considered detail.', rating: 5, featured: true, sortOrder: 3 },
  { name: 'James Thornton', title: 'Film Director, Los Angeles', comment: 'From red carpet events to intimate dinners, every piece delivers. The evening gown I commissioned for the premiere was a masterpiece. The entire experience felt deeply personal and luxurious.', rating: 5, featured: false, sortOrder: 4 },
  { name: 'Amara Okafor', title: 'International Supermodel', comment: 'As someone who wears the world\'s finest fashion, I can say with certainty that these pieces are exceptional. The kimono jacket is a work of art. The embroidery alone tells a story of dedication and mastery.', rating: 5, featured: false, sortOrder: 5 },
  { name: 'Luca Moretti', title: 'Art Collector, Milan', comment: 'True luxury is in the restraint, and this brand understands that profoundly. Each piece is a study in understated elegance. The leather tote has become my most trusted companion, aging beautifully with time.', rating: 5, featured: true, sortOrder: 6 },
];

const coupons = [
  { code: 'LUXURY20', type: 'percentage', value: 20, minOrder: 500, maxDiscount: 2000, usageLimit: 100, validFrom: new Date('2024-01-01'), validUntil: new Date('2027-12-31'), active: true },
  { code: 'WELCOME15', type: 'percentage', value: 15, minOrder: 300, maxDiscount: 1500, usageLimit: 500, validFrom: new Date('2024-01-01'), validUntil: new Date('2027-12-31'), active: true },
  { code: 'SEASONAL10', type: 'fixed', value: 100, minOrder: 800, maxDiscount: null, usageLimit: 200, validFrom: new Date('2024-01-01'), validUntil: new Date('2027-12-31'), active: true },
];

async function main() {
  // Clear existing data
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.review.deleteMany();
  await prisma.product.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.category.deleteMany();
  await prisma.newsletter.deleteMany();

  console.log('Seeding categories...');
  const createdCategories = await Promise.all(
    categories.map(c => prisma.category.create({ data: c }))
  );
  const categoryMap = Object.fromEntries(createdCategories.map(c => [c.slug, c.id]));

  console.log('Seeding brands...');
  const createdBrands = await Promise.all(
    brands.map(b => prisma.brand.create({ data: b }))
  );
  const brandMap = Object.fromEntries(createdBrands.map(b => [b.slug, b.id]));

  console.log('Seeding products...');
  const productImages: Record<string, string[]> = {
    'silk-drape-evening-gown': [
      'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&h=1100&fit=crop',
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=1100&fit=crop',
      'https://images.unsplash.com/photo-1568252542512-9fe8fe9c87bb?w=800&h=1100&fit=crop',
    ],
    'tailored-wool-blazer': [
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&h=1100&fit=crop',
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1100&fit=crop',
    ],
    'leather-sculptural-heel': [
      'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&h=1100&fit=crop',
      'https://images.unsplash.com/photo-1596703263926-eb0762ee17e4?w=800&h=1100&fit=crop',
    ],
    'cashmere-wrap-coat': [
      'https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?w=800&h=1100&fit=crop',
      'https://images.unsplash.com/photo-1548624313-0396c75e4b1a?w=800&h=1100&fit=crop',
    ],
    'quilted-chain-shoulder-bag': [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&h=1100&fit=crop',
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=1100&fit=crop',
    ],
    'structured-double-breasted-suit': [
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1100&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=1100&fit=crop',
    ],
    'minimalist-leather-sneakers': [
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&h=1100&fit=crop',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&h=1100&fit=crop',
    ],
    'deconstructed-linen-shirt': [
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&h=1100&fit=crop',
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&h=1100&fit=crop',
    ],
    'heritage-silk-scarf': [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&h=1100&fit=crop',
      'https://images.unsplash.com/photo-1601924921557-45e8e1af0014?w=800&h=1100&fit=crop',
    ],
    'ceramic-chronograph-watch': [
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&h=1100&fit=crop',
      'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=800&h=1100&fit=crop',
    ],
    'leather-tote-bag': [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=1100&fit=crop',
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&h=1100&fit=crop',
    ],
  };

  for (const p of products) {
    const categoryId = categoryMap[p.categoryId as string];
    const brandId = brandMap[p.brandSlug as string];
    if (!categoryId || !brandId) continue;

    const images = productImages[p.slug] || [
      'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800&h=1100&fit=crop',
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=1100&fit=crop',
    ];

    await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDesc: p.shortDesc,
        price: p.price,
        comparePrice: p.comparePrice,
        categoryId,
        brandId,
        sizes: p.sizes,
        colors: p.colors,
        material: p.material,
        care: p.care,
        featured: p.featured,
        newArrival: p.newArrival,
        bestSeller: p.bestSeller,
        trending: p.trending,
        stock: p.stock,
        rating: p.rating,
        reviewCount: p.reviewCount,
        tags: p.tags,
        images: JSON.stringify(images),
      },
    });
  }

  console.log('Seeding testimonials...');
  await Promise.all(
    testimonials.map(t => prisma.testimonial.create({ data: t }))
  );

  console.log('Seeding coupons...');
  await Promise.all(
    coupons.map(c => prisma.coupon.create({ data: c }))
  );

  console.log('Database seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
