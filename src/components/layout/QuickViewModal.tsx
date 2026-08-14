'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/ui-store';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Heart, Minus, Plus, ShoppingBag, Loader2 } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
type ProductData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDesc: string | null;
  price: number;
  comparePrice: number | null;
  images: string[];
  sizes: string[];
  colors: string[];
  brand?: { name: string } | null;
  category?: { name: string } | null;
  stock: number;
  material: string | null;
  rating: number;
  reviewCount: number;
};

/* ------------------------------------------------------------------ */
/* Color swatch mapping                                                */
/* ------------------------------------------------------------------ */
const COLOR_MAP: Record<string, string> = {
  black: '#1a1a1a',
  white: '#f5f5f5',
  navy: '#1e293b',
  red: '#dc2626',
  burgundy: '#7f1d1d',
  brown: '#92400e',
  beige: '#d4c5a9',
  cream: '#fef3c7',
  gold: '#C9A96E',
  silver: '#9ca3af',
  pink: '#ec4899',
  blue: '#3b82f6',
  green: '#16a34a',
  grey: '#6b7280',
  gray: '#6b7280',
  ivory: '#fffff0',
  camel: '#c19a6b',
  tan: '#d2b48c',
};

/* ------------------------------------------------------------------ */
/* Animation variants                                                  */
/* ------------------------------------------------------------------ */
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 10,
    transition: { duration: 0.25, ease: [0.55, 0, 1, 0.45] },
  },
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function QuickViewModal() {
  const quickViewProduct = useUIStore((s) => s.quickViewProduct);
  const setQuickViewProduct = useUIStore((s) => s.setQuickViewProduct);
  const addToCart = useCartStore((s) => s.addItem);
  const wishlistItems = useWishlistStore((s) => s.items);
  const wishlistAdd = useWishlistStore((s) => s.addItem);
  const wishlistRemove = useWishlistStore((s) => s.removeItem);

  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const isOpen = !!quickViewProduct;

  // Fetch product data
  useEffect(() => {
    if (!quickViewProduct) {
      setProduct(null);
      return;
    }

    const fetchProduct = async () => {
      setLoading(true);
      setSelectedImage(0);
      setSelectedSize(null);
      setSelectedColor(null);
      setQuantity(1);
      setAddedFeedback(false);

      try {
        const res = await fetch(`/api/products/${quickViewProduct}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data.product);
          // Auto-select first size/color if only one option
          if (data.product.sizes?.length === 1) setSelectedSize(data.product.sizes[0]);
          if (data.product.colors?.length === 1) setSelectedColor(data.product.colors[0]);
        }
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [quickViewProduct]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setQuickViewProduct(null);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, setQuickViewProduct]);

  const isInWishlist = product ? wishlistItems.some((w) => w.productId === product.id) : false;

  const handleAddToCart = useCallback(() => {
    if (!product) return;

    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0] || '',
      quantity,
      size: selectedSize || undefined,
      color: selectedColor || undefined,
    });

    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1500);
  }, [product, quantity, selectedSize, selectedColor, addToCart]);

  const handleWishlistToggle = useCallback(() => {
    if (!product) return;

    if (isInWishlist) {
      wishlistRemove(product.id);
    } else {
      wishlistAdd({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.images[0] || '',
        addedAt: new Date().toISOString(),
      });
    }
  }, [product, isInWishlist, wishlistAdd, wishlistRemove]);

  const sizeRequired = product?.sizes && product.sizes.length > 1;
  const colorRequired = product?.colors && product.colors.length > 1;
  const canAdd = !sizeRequired || selectedSize;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="quickview-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setQuickViewProduct(null);
          }}
        >
          <motion.div
            key="quickview-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative max-h-[90vh] w-[95vw] max-w-4xl overflow-y-auto rounded-sm bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setQuickViewProduct(null)}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/10 text-black/60 transition-colors hover:bg-black/20 hover:text-black"
              aria-label="Close quick view"
            >
              <X className="h-4 w-4" />
            </button>

            {loading ? (
              <div className="flex h-80 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#C9A96E]" />
              </div>
            ) : product ? (
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Left: Image gallery */}
                <div className="p-6 md:p-8">
                  {/* Main image */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-[#f5f5f5]">
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={selectedImage}
                        src={product.images[selectedImage] || '/placeholder.jpg'}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      />
                    </AnimatePresence>

                    {/* Sale badge */}
                    {product.comparePrice && product.comparePrice > product.price && (
                      <Badge className="absolute top-3 left-3 bg-[#C9A96E] text-black border-none font-['Inter'] text-xs tracking-wider uppercase">
                        Sale
                      </Badge>
                    )}
                  </div>

                  {/* Thumbnails */}
                  {product.images.length > 1 && (
                    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                      {product.images.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedImage(i)}
                          className={`relative h-16 w-14 flex-shrink-0 overflow-hidden rounded-sm transition-all duration-200 ${
                            selectedImage === i
                              ? 'ring-2 ring-[#C9A96E] ring-offset-1'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={img}
                            alt={`${product.name} view ${i + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Product details */}
                <div className="flex flex-col justify-center p-6 md:p-8 md:pl-4">
                  {/* Brand */}
                  {product.brand && (
                    <p className="font-['Inter'] text-xs uppercase tracking-[0.2em] text-[#C9A96E] font-medium">
                      {product.brand.name}
                    </p>
                  )}

                  {/* Name */}
                  <h2 className="mt-2 font-['Playfair_Display'] text-2xl md:text-3xl font-medium text-[#0A0A0A] leading-tight">
                    {product.name}
                  </h2>

                  {/* Price */}
                  <div className="mt-3 flex items-baseline gap-3">
                    <span className="font-['Inter'] text-2xl font-semibold text-[#0A0A0A]">
                      ${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    {product.comparePrice && product.comparePrice > product.price && (
                      <span className="font-['Inter'] text-base text-black/40 line-through">
                        ${product.comparePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>

                  {/* Rating */}
                  {product.rating > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`text-sm ${i < Math.round(product.rating) ? 'text-[#C9A96E]' : 'text-black/15'}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="font-['Inter'] text-xs text-black/40">
                        ({product.reviewCount})
                      </span>
                    </div>
                  )}

                  <Separator className="my-5 bg-black/10" />

                  {/* Description */}
                  <p className="font-['Inter'] text-sm leading-relaxed text-black/60">
                    {product.shortDesc || product.description || 'A luxurious piece crafted with exceptional attention to detail and the finest materials.'}
                  </p>

                  {/* Size selector */}
                  {product.sizes && product.sizes.length > 0 && (
                    <div className="mt-6">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-['Inter'] text-xs uppercase tracking-[0.15em] text-black/60 font-medium">
                          Size
                        </span>
                        {sizeRequired && !selectedSize && (
                          <span className="font-['Inter'] text-xs text-red-500">Select a size</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {product.sizes.map((size) => (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`flex h-10 min-w-[44px] items-center justify-center rounded-sm border px-3 font-['Inter'] text-sm transition-all duration-200 ${
                              selectedSize === size
                                ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                                : 'border-black/20 text-black/70 hover:border-black/50'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Color selector */}
                  {product.colors && product.colors.length > 0 && (
                    <div className="mt-5">
                      <span className="mb-3 block font-['Inter'] text-xs uppercase tracking-[0.15em] text-black/60 font-medium">
                        Color{selectedColor ? `: ${selectedColor}` : ''}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {product.colors.map((color) => {
                          const swatchColor = COLOR_MAP[color.toLowerCase()] || color;
                          const isNamedColor = !!COLOR_MAP[color.toLowerCase()];

                          return (
                            <button
                              key={color}
                              onClick={() => setSelectedColor(color)}
                              title={color}
                              className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                                selectedColor === color
                                  ? 'border-[#0A0A0A] scale-110'
                                  : 'border-black/15 hover:border-black/40'
                              }`}
                              aria-label={`Color: ${color}`}
                            >
                              <span
                                className={`h-5 w-5 rounded-full ${isNamedColor ? '' : 'bg-black/30'}`}
                                style={isNamedColor ? { backgroundColor: swatchColor } : undefined}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quantity + Wishlist row */}
                  <div className="mt-6 flex items-center gap-4">
                    <span className="font-['Inter'] text-xs uppercase tracking-[0.15em] text-black/60 font-medium">
                      Qty
                    </span>
                    <div className="flex items-center border border-black/20 rounded-sm">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="flex h-10 w-10 items-center justify-center text-black/60 hover:text-black transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="flex h-10 w-10 items-center justify-center font-['Inter'] text-sm font-medium text-black/90">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity((q) => q + 1)}
                        className="flex h-10 w-10 items-center justify-center text-black/60 hover:text-black transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="ml-auto">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleWishlistToggle}
                        className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors duration-200 ${
                          isInWishlist
                            ? 'border-red-200 bg-red-50 text-red-500'
                            : 'border-black/15 text-black/40 hover:border-black/30 hover:text-black/60'
                        }`}
                        aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-current' : ''}`} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Add to Bag button */}
                  <Button
                    onClick={handleAddToCart}
                    disabled={!canAdd}
                    className={`mt-6 w-full py-4 uppercase tracking-[0.2em] font-semibold font-['Inter'] text-sm rounded-none transition-all duration-300 ${
                      addedFeedback
                        ? 'bg-green-700 text-white'
                        : 'bg-[#0A0A0A] text-white hover:bg-[#1a1a1a]'
                    } ${!canAdd ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {addedFeedback ? (
                      <span className="flex items-center justify-center gap-2">
                        Added to Bag
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        >
                          ✓
                        </motion.span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <ShoppingBag className="h-4 w-4" />
                        Add to Bag
                      </span>
                    )}
                  </Button>

                  {/* Material info */}
                  {product.material && (
                    <p className="mt-4 text-center font-['Inter'] text-xs text-black/40">
                      Material: {product.material}
                    </p>
                  )}

                  {/* View Full Details link */}
                  <a
                    href={`/product/${product.slug}`}
                    className="mt-3 block text-center font-['Inter'] text-xs uppercase tracking-widest text-[#C9A96E] hover:text-black transition-colors"
                    onClick={() => closeQuickView()}
                  >
                    View Full Details
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex h-60 items-center justify-center font-['Inter'] text-black/40">
                Product not found
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
