'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/stores/cart-store';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { X, Minus, Plus, ShoppingBag, Tag, ArrowRight } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Animations                                                          */
/* ------------------------------------------------------------------ */
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.3, ease: 'easeIn' } },
};

const panelVariants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit: { x: '100%', transition: { duration: 0.35, ease: [0.55, 0, 1, 0.45] } },
};

const itemVariants = {
  initial: { opacity: 0, x: 40, height: 0 },
  animate: { opacity: 1, x: 0, height: 'auto', transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: 40, height: 0, transition: { duration: 0.3, ease: [0.55, 0, 1, 0.45] } },
};

const TRENDING_SUGGESTIONS = [
  'Silk Gown',
  'Leather Bag',
  'Cashmere Coat',
  'Gold Necklace',
  'Designer Heels',
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function CartSidebar() {
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

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const itemCount = getItemCount();
  const subtotal = getSubtotal();
  const total = getTotal();

  // Lock body scroll when open
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dark overlay */}
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

          {/* Panel */}
          <motion.aside
            key="cart-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-0 right-0 bottom-0 z-[71] flex w-[420px] max-w-[90vw] flex-col bg-[#0A0A0A] shadow-2xl"
            role="dialog"
            aria-label="Shopping bag"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <h2 className="font-['Playfair_Display'] text-xl font-medium text-white">
                  Shopping Bag
                </h2>
                <Badge
                  variant="secondary"
                  className="bg-white/10 text-white/80 text-xs font-['Inter'] tracking-wide"
                >
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeCart}
                className="text-white/60 hover:text-white hover:bg-white/10"
                aria-label="Close bag"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {items.length === 0 ? (
              <EmptyCart />
            ) : (
              <>
                {/* Items list */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <AnimatePresence mode="popLayout">
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        variants={itemVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        layout
                        className="mb-5"
                      >
                        <div className="flex gap-4">
                          {/* Product image */}
                          <div className="relative h-24 w-20 flex-shrink-0 overflow-hidden rounded bg-white/5">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <ShoppingBag className="h-6 w-6 text-white/20" />
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex flex-1 flex-col justify-between min-w-0">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-['Inter'] text-sm font-medium text-white/90 truncate">
                                  {item.name}
                                </h3>
                                <button
                                  onClick={() => removeItem(item.id)}
                                  className="flex-shrink-0 text-white/30 hover:text-white transition-colors"
                                  aria-label={`Remove ${item.name}`}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-xs text-white/50 font-['Inter']">
                                {item.size && <span>Size: {item.size}</span>}
                                {item.size && item.color && <span>·</span>}
                                {item.color && <span>{item.color}</span>}
                              </div>
                              <p className="mt-1 text-sm font-medium text-[#C9A96E] font-['Inter']">
                                ${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </p>
                            </div>

                            {/* Quantity controls */}
                            <div className="flex items-center gap-1 mt-2">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="flex h-7 w-7 items-center justify-center rounded border border-white/15 text-white/60 hover:border-[#C9A96E] hover:text-[#C9A96E] transition-colors"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="flex h-7 w-8 items-center justify-center text-sm font-['Inter'] text-white/90">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="flex h-7 w-7 items-center justify-center rounded border border-white/15 text-white/60 hover:border-[#C9A96E] hover:text-[#C9A96E] transition-colors"
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <Separator className="mt-5 bg-white/10" />
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Coupon input */}
                  <div className="mt-4">
                    {couponCode ? (
                      <div className="flex items-center justify-between rounded border border-[#C9A96E]/30 bg-[#C9A96E]/5 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-[#C9A96E]" />
                          <span className="text-sm font-['Inter'] text-[#C9A96E]">
                            {couponCode}
                          </span>
                          <span className="text-xs font-['Inter'] text-white/50">
                            −${couponDiscount.toFixed(2)}
                          </span>
                        </div>
                        <button
                          onClick={removeCoupon}
                          className="text-white/40 hover:text-white transition-colors"
                          aria-label="Remove coupon"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value);
                            setCouponError('');
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                          placeholder="Coupon code"
                          className="h-10 flex-1 border-white/15 bg-white/5 font-['Inter'] text-sm text-white placeholder:text-white/30 focus-visible:ring-[#C9A96E]/40 focus-visible:border-[#C9A96E]/50"
                        />
                        <Button
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponInput.trim()}
                          variant="outline"
                          className="h-10 border-[#C9A96E]/50 text-[#C9A96E] hover:bg-[#C9A96E] hover:text-black font-['Inter'] text-xs uppercase tracking-widest transition-colors"
                        >
                          {couponLoading ? '...' : 'Apply'}
                        </Button>
                      </div>
                    )}
                    {couponError && (
                      <p className="mt-2 text-xs text-red-400/80 font-['Inter']">{couponError}</p>
                    )}
                  </div>
                </div>

                {/* Footer - sticky bottom */}
                <div className="border-t border-white/10 bg-[#0A0A0A] px-6 py-5">
                  <div className="space-y-2 font-['Inter']">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Subtotal</span>
                      <span className="text-white/90">
                        ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {couponDiscount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#C9A96E]">Discount ({couponCode})</span>
                        <span className="text-[#C9A96E]">
                          −${couponDiscount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <Separator className="bg-white/10" />

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-semibold text-white">Total</span>
                      <span className="text-lg font-semibold text-white">
                        ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="mt-4 w-full bg-[#C9A96E] text-black uppercase tracking-[0.2em] font-semibold font-['Inter'] py-4 hover:bg-[#b8953d] transition-colors rounded-none"
                  >
                    Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <button
                    onClick={closeCart}
                    className="mt-3 w-full text-center text-sm font-['Inter'] text-white/50 hover:text-[#C9A96E] transition-colors"
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

/* ------------------------------------------------------------------ */
/* Empty Cart State                                                    */
/* ------------------------------------------------------------------ */
function EmptyCart() {
  const closeCart = useCartStore((s) => s.closeCart);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      {/* Luxury illustration area */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]"
      >
        <ShoppingBag className="h-12 w-12 text-white/15" strokeWidth={1} />
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="font-['Playfair_Display'] text-xl text-white/80"
      >
        Your bag is empty
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="mt-2 font-['Inter'] text-sm text-white/40 max-w-[240px]"
      >
        Discover our curated collections and add your favorite pieces
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="mt-6"
      >
        <Button
          onClick={closeCart}
          className="border border-[#C9A96E]/50 bg-transparent text-[#C9A96E] uppercase tracking-[0.15em] text-xs font-semibold font-['Inter'] hover:bg-[#C9A96E] hover:text-black transition-colors rounded-none px-8 py-3"
        >
          Explore Collection
        </Button>
      </motion.div>
    </div>
  );
}
