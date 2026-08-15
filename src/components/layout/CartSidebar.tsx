'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/stores/cart-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Minus, Plus, ShoppingBag, Tag, Check, ArrowRight, Loader2 } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */
const FREE_SHIPPING_THRESHOLD = 500;

/* ------------------------------------------------------------------ */
/* Noise texture SVG data URI                                          */
/* ------------------------------------------------------------------ */
const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`;

/* ------------------------------------------------------------------ */
/* Animation Variants                                                  */
/* ------------------------------------------------------------------ */
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35, ease: 'easeOut' as const } },
  exit: { opacity: 0, transition: { duration: 0.3, ease: 'easeIn' as const } },
};

const panelVariants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { x: '100%', transition: { duration: 0.35, ease: [0.55, 0, 1, 0.45] as const } },
};

const itemVariants = {
  initial: { opacity: 0, x: 40, height: 0 },
  animate: {
    opacity: 1,
    x: 0,
    height: 'auto',
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: {
    opacity: 0,
    x: 40,
    height: 0,
    transition: { duration: 0.3, ease: [0.55, 0, 1, 0.45] as const },
  },
};

const recommendationVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
function formatPrice(price: number): string {
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
type RecommendedProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  brand?: { name: string } | null;
};

/* ================================================================== */
/* Component                                                           */
/* ================================================================== */
export default function CartSidebar() {
  /* ---- Store selectors ---- */
  const items = useCartStore((s) => s.items);
  const isOpen = useCartStore((s) => s.isOpen);
  const closeCart = useCartStore((s) => s.closeCart);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getTotal = useCartStore((s) => s.getTotal);
  const getItemCount = useCartStore((s) => s.getItemCount);
  const couponCode = useCartStore((s) => s.couponCode);
  const couponDiscount = useCartStore((s) => s.couponDiscount);
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);
  const addItem = useCartStore((s) => s.addItem);

  /* ---- Local state ---- */
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [recLoading, setRecLoading] = useState(false);

  /* ---- Derived values ---- */
  const itemCount = getItemCount();
  const subtotal = getSubtotal();
  const total = getTotal();
  const shippingProgress = Math.min(subtotal / FREE_SHIPPING_THRESHOLD, 1);
  const shippingRemaining = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);
  const qualifiesForFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;

  /* ---- Body scroll lock ---- */
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

  /* ---- Fetch recommendations when cart has items ---- */
  useEffect(() => {
    if (isOpen && items.length > 0 && recommendations.length === 0) {
      setRecLoading(true);
      fetch('/api/products?limit=4&trending=true')
        .then((res) => res.json())
        .then((data) => {
          if (data.products) {
            setRecommendations(data.products);
          }
        })
        .catch(() => {})
        .finally(() => setRecLoading(false));
    }
  }, [isOpen, items.length, recommendations.length]);

  /* ---- Coupon handler ---- */
  const handleApplyCoupon = useCallback(async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    setCouponLoading(true);
    setCouponError('');

    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, orderTotal: subtotal }),
      });
      const data = await res.json();

      if (res.ok && data.discount !== undefined) {
        applyCoupon(code, data.discount);
        setCouponInput('');
      } else {
        setCouponError('Invalid or expired coupon code');
      }
    } catch {
      setCouponError('Could not verify coupon');
    } finally {
      setCouponLoading(false);
    }
  }, [couponInput, subtotal, applyCoupon]);

  /* ---- Add recommendation to cart ---- */
  const handleAddRecommendation = useCallback(
    (product: RecommendedProduct) => {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || '',
        quantity: 1,
        brand: product.brand?.name,
      });
    },
    [addItem],
  );

  /* ================================================================ */
  /* Render                                                            */
  /* ================================================================ */
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Dark Overlay ── */}
          <motion.div
            key="cart-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            onClick={closeCart}
            aria-hidden
          />

          {/* ── Side Panel ── */}
          <motion.aside
            key="cart-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-0 right-0 bottom-0 z-[71] flex w-[440px] max-w-full flex-col bg-[#0A0A0A] shadow-2xl border-l border-white/5"
            role="dialog"
            aria-label="Shopping bag"
          >
            {/* Noise texture overlay */}
            <div
              className="pointer-events-none absolute inset-0 z-0 opacity-[0.4]"
              style={{ backgroundImage: NOISE_SVG, backgroundRepeat: 'repeat', backgroundSize: '256px 256px' }}
              aria-hidden
            />

            {/* ═══════════════════════════════════════════════════════ */}
            {/* Header                                                   */}
            {/* ═══════════════════════════════════════════════════════ */}
            <div className="relative z-10 flex flex-col px-6 pt-6 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="font-['Playfair_Display'] text-[20px] font-medium text-white">
                    Shopping Bag
                  </h2>
                  {items.length > 0 && (
                    <span className="inline-flex items-center rounded bg-white/10 px-2.5 py-0.5 font-['Inter'] text-xs text-white/80 tracking-wide">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </span>
                  )}
                </div>
                <button
                  onClick={closeCart}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                  aria-label="Close bag"
                >
                  <X className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </div>
              {items.length > 0 && (
                <p className="mt-1.5 font-['Inter'] text-[11px] text-white/30">
                  Estimated delivery: 3–5 business days
                </p>
              )}
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* Empty State                                              */}
            {/* ═══════════════════════════════════════════════════════ */}
            {items.length === 0 && <EmptyCart />}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* Cart Content (items + recommendations)                    */}
            {/* ═══════════════════════════════════════════════════════ */}
            {items.length > 0 && (
              <>
                {/* ── Scrollable Area ── */}
                <div className="relative z-10 flex-1 overflow-y-auto px-6 pt-2 pb-4 scrollbar-thin">
                  <style jsx>{`
                    .scrollbar-thin::-webkit-scrollbar {
                      width: 4px;
                    }
                    .scrollbar-thin::-webkit-scrollbar-track {
                      background: transparent;
                    }
                    .scrollbar-thin::-webkit-scrollbar-thumb {
                      background: rgba(255, 255, 255, 0.1);
                      border-radius: 2px;
                    }
                    .scrollbar-thin::-webkit-scrollbar-thumb:hover {
                      background: rgba(255, 255, 255, 0.2);
                    }
                  `}</style>

                  {/* ── Cart Items ── */}
                  <AnimatePresence mode="popLayout">
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        variants={itemVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        layout
                        className="mb-1"
                      >
                        <div className="flex gap-4 py-4">
                          {/* Product image */}
                          <div className="relative h-[100px] w-[80px] flex-shrink-0 overflow-hidden rounded-md bg-white/5">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <ShoppingBag className="h-6 w-6 text-white/20" strokeWidth={1} />
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex flex-1 flex-col justify-between min-w-0">
                            {/* Top row: name + remove */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                {item.brand && (
                                  <p className="font-['Inter'] text-[10px] uppercase tracking-wider text-[#C9A96E]">
                                    {item.brand}
                                  </p>
                                )}
                                <h3 className="mt-0.5 font-['Inter'] text-[14px] font-medium text-white/90 truncate">
                                  {item.name}
                                </h3>
                              </div>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="flex-shrink-0 text-white/25 transition-colors hover:text-white/70"
                                aria-label={`Remove ${item.name}`}
                              >
                                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                              </button>
                            </div>

                            {/* Size / Color */}
                            {(item.size || item.color) && (
                              <p className="font-['Inter'] text-[11px] text-white/40">
                                {item.size && <span>Size: {item.size}</span>}
                                {item.size && item.color && <span className="mx-1.5">·</span>}
                                {item.color && <span>{item.color}</span>}
                              </p>
                            )}

                            {/* Price + Quantity row */}
                            <div className="mt-1.5 flex items-center justify-between">
                              <p className="font-['Inter'] text-[14px] text-[#C9A96E]">
                                {formatPrice(item.price)}
                              </p>

                              {/* Quantity controls */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded border border-white/15 text-white/60 transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E]"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="h-3 w-3" strokeWidth={1.5} />
                                </button>
                                <span className="flex h-7 w-8 items-center justify-center font-['Inter'] text-[13px] text-white/90 tabular-nums">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="flex h-7 w-7 items-center justify-center rounded border border-white/15 text-white/60 transition-colors hover:border-[#C9A96E] hover:text-[#C9A96E]"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="h-3 w-3" strokeWidth={1.5} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Separator */}
                        <div className="h-px bg-white/5" />
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* ── Free Shipping Progress ── */}
                  <div className="mt-5">
                    {!qualifiesForFreeShipping ? (
                      <>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-['Inter'] text-[11px] text-white/40">
                            Add {formatPrice(shippingRemaining)} more for complimentary shipping
                          </span>
                          <span className="font-['Inter'] text-[10px] text-white/30 tabular-nums">
                            {formatPrice(subtotal)} / {formatPrice(FREE_SHIPPING_THRESHOLD)}
                          </span>
                        </div>
                        <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            className="h-full rounded-full bg-[#C9A96E]"
                            initial={{ width: 0 }}
                            animate={{ width: `${shippingProgress * 100}%` }}
                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-[#C9A96E]" strokeWidth={2} />
                        <span className="font-['Inter'] text-[11px] text-[#C9A96E]">
                          You qualify for complimentary shipping
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── Coupon Section ── */}
                  <div className="mt-5">
                    {couponCode ? (
                      <div className="flex items-center justify-between rounded border border-[#C9A96E]/30 bg-[#C9A96E]/5 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-[#C9A96E]" strokeWidth={1.5} />
                          <span className="font-['Inter'] text-[13px] font-medium text-[#C9A96E]">
                            {couponCode}
                          </span>
                          <span className="font-['Inter'] text-[12px] text-white/50">
                            −{formatPrice(couponDiscount)}
                          </span>
                        </div>
                        <button
                          onClick={removeCoupon}
                          className="text-white/40 transition-colors hover:text-white"
                          aria-label="Remove coupon"
                        >
                          <X className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <Input
                            value={couponInput}
                            onChange={(e) => {
                              setCouponInput(e.target.value);
                              setCouponError('');
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                            placeholder="Coupon code"
                            className="h-10 flex-1 border-white/15 bg-white/5 font-['Inter'] text-[13px] text-white placeholder:text-white/25 focus-visible:ring-1 focus-visible:ring-[#C9A96E]/40 focus-visible:border-[#C9A96E]/50"
                          />
                          <Button
                            onClick={handleApplyCoupon}
                            disabled={couponLoading || !couponInput.trim()}
                            variant="outline"
                            className="h-10 shrink-0 border-[#C9A96E]/50 font-['Inter'] text-[12px] uppercase tracking-[0.15em] text-[#C9A96E] hover:bg-[#C9A96E] hover:text-black hover:border-[#C9A96E] transition-colors disabled:opacity-40"
                          >
                            {couponLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              'Apply'
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                    {couponError && (
                      <p className="mt-2 font-['Inter'] text-[12px] text-red-400/80">
                        {couponError}
                      </p>
                    )}
                  </div>

                  {/* ── Recommendations ── */}
                  {items.length > 0 && (
                    <div className="mt-6">
                      <h4 className="mb-3 font-['Inter'] text-[10px] uppercase tracking-[0.2em] text-white/30">
                        You May Also Like
                      </h4>
                      {recLoading ? (
                        <div className="flex gap-3">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="w-[90px] flex-shrink-0 animate-pulse"
                            >
                              <div className="h-[80px] w-[60px] rounded bg-white/5" />
                              <div className="mt-2 h-3 w-[60px] rounded bg-white/5" />
                              <div className="mt-1.5 h-2.5 w-[40px] rounded bg-white/5" />
                            </div>
                          ))}
                        </div>
                      ) : recommendations.length > 0 ? (
                        <div className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                          {recommendations.map((product) => (
                            <motion.button
                              key={product.id}
                              variants={recommendationVariants}
                              initial="initial"
                              animate="animate"
                              onClick={() => handleAddRecommendation(product)}
                              className="group flex w-[90px] flex-shrink-0 flex-col items-start gap-1.5 transition-transform hover:scale-[1.03]"
                              aria-label={`Add ${product.name} to bag`}
                            >
                              <div className="relative h-[80px] w-[60px] overflow-hidden rounded bg-white/5">
                                {product.images?.[0] ? (
                                  <img
                                    src={product.images[0]}
                                    alt={product.name}
                                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <ShoppingBag className="h-5 w-5 text-white/15" strokeWidth={1} />
                                  </div>
                                )}
                              </div>
                              <p className="w-full font-['Inter'] text-[11px] text-white/60 truncate">
                                {product.name}
                              </p>
                              <p className="font-['Inter'] text-[11px] text-white/40">
                                {formatPrice(product.price)}
                              </p>
                            </motion.button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* ═══════════════════════════════════════════════════ */}
                {/* Footer (sticky bottom)                               */}
                {/* ═══════════════════════════════════════════════════ */}
                <div className="relative z-10 border-t border-white/10 bg-[#0A0A0A] px-6 pt-5 pb-6">
                  {/* Subtotal */}
                  <div className="flex items-center justify-between font-['Inter'] text-[13px]">
                    <span className="text-white/60">Subtotal</span>
                    <span className="text-white/90">{formatPrice(subtotal)}</span>
                  </div>

                  {/* Discount */}
                  {couponDiscount > 0 && couponCode && (
                    <div className="mt-1.5 flex items-center justify-between font-['Inter'] text-[13px]">
                      <span className="text-[#C9A96E]">Discount ({couponCode})</span>
                      <span className="text-[#C9A96E]">−{formatPrice(couponDiscount)}</span>
                    </div>
                  )}

                  {/* Separator */}
                  <div className="my-3 h-px bg-white/10" />

                  {/* Total */}
                  <div className="flex items-center justify-between">
                    <span className="font-['Inter'] text-[14px] font-semibold text-white">Total</span>
                    <span className="font-['Inter'] text-[20px] font-semibold text-white tabular-nums">
                      {formatPrice(total)}
                    </span>
                  </div>

                  {/* Checkout button */}
                  <Button
                    className="mt-4 w-full bg-[#C9A96E] font-['Inter'] text-[12px] font-semibold uppercase tracking-[0.2em] text-black py-4 hover:bg-[#b8953d] transition-colors rounded-none"
                  >
                    Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  {/* Continue Shopping */}
                  <button
                    onClick={closeCart}
                    className="mt-3 w-full text-center font-['Inter'] text-[13px] text-white/40 transition-colors hover:text-[#C9A96E]"
                  >
                    Continue Shopping
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ================================================================== */
/* Empty Cart State                                                     */
/* ================================================================== */
function EmptyCart() {
  const closeCart = useCartStore((s) => s.closeCart);

  return (
    <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
      {/* Icon container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]"
      >
        <ShoppingBag className="h-12 w-12 text-white/15" strokeWidth={1} />
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="font-['Playfair_Display'] text-[20px] text-white/80"
      >
        Your bag is empty
      </motion.h3>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="mt-2 max-w-[260px] font-['Inter'] text-[13px] leading-relaxed text-white/40"
      >
        Discover our curated collections and add your favorite pieces
      </motion.p>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="mt-6"
      >
        <Button
          onClick={closeCart}
          variant="outline"
          className="border-[#C9A96E]/50 bg-transparent font-['Inter'] text-[12px] font-semibold uppercase tracking-[0.15em] text-[#C9A96E] hover:bg-[#C9A96E] hover:text-black hover:border-[#C9A96E] transition-colors rounded-none px-8 py-3"
        >
          Explore Collection
        </Button>
      </motion.div>
    </div>
  );
}
