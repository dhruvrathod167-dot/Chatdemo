/* ─────────────────────────────────────────────
   Luxury Fashion eCommerce — Type Definitions
   ───────────────────────────────────────────── */

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDesc: string | null;
  price: number;
  comparePrice: number | null;
  currency: string;
  sku: string | null;
  images: string[];
  video: string | null;
  categoryId: string;
  category?: Category;
  brandId: string | null;
  brand?: Brand;
  sizes: string[];
  colors: string[];
  material: string | null;
  care: string | null;
  featured: boolean;
  newArrival: boolean;
  bestSeller: boolean;
  trending: boolean;
  rating: number;
  reviewCount: number;
  stock: number;
  tags: string[];
  metaTitle: string | null;
  metaDesc: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  children?: Category[];
  products?: Product[];
  sortOrder: number;
  featured: boolean;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  story: string | null;
  country: string | null;
  founded: number | null;
  featured: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  size?: string;
  color?: string;
  price: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
}

export interface WishlistItem {
  id: string;
  productId: string;
  product?: Product;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId?: string;
  userName?: string;
  rating: number;
  title?: string;
  comment?: string;
  verified: boolean;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrder?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  active: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  title?: string;
  comment: string;
  avatar?: string;
  rating: number;
  featured: boolean;
  sortOrder: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  items: any[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  paymentMethod?: string;
  createdAt: string;
}
