'use client'

import { useRef, useState, useCallback } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Heart, ShoppingBag, Eye, GitCompareArrows } from 'lucide-react'
import type { Product } from '@/types'
import { useCartStore } from '@/stores/cart-store'
import { useWishlistStore } from '@/stores/wishlist-store'
import { useUIStore } from '@/stores/ui-store'
import { useHydrated } from '@/hooks/use-hydrated'

const cardVariants = {
  hidden: { y: 60, opacity: 0 },
  visible: (i: number) => ({
    y: 0, opacity: 1,
    transition: { delay: i * 0.06, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}
export default function ProductGrid({ products, title, subtitle }: {
  products: Product[]
  title?: string
  subtitle?: string
}) {
  return (
    <div className="py-16 md:py-24 px-6 md:px-12 lg:px-24 bg-[#FAFAFA] min-h-[60vh]">
      {title && (
        <div className="text-center mb-16">
          {subtitle && (
            <p className="font-[\'Inter\'] text-[11px] tracking-[0.3em] uppercase text-[#C9A96E] mb-3">{subtitle}</p>
          )}
          <h2 className="font-[\'Playfair_Display\'] text-3xl md:text-5xl text-[#0A0A0A] mb-4 font-medium">{title}</h2>
          <div className="w-12 h-px bg-[#C9A96E] mx-auto mt-4" />
        </div>
      )}
      {products.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-[\'Inter\'] text-gray-400 text-sm">No products found in this collection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      )}
    </div>
  )
}
function ProductCard({ product, index }: { product: Product; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  const hydrated = useHydrated()
  const addToCart = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)
  const { addItem: addWishlist, removeItem: removeWishlist, isInWishlist } = useWishlistStore()
  const setQuickView = useUIStore((s) => s.setQuickViewProduct)
  const isWishlisted = isInWishlist(product.id)
  const hasImage = product.images && product.images.length > 0
  const hasMultipleImages = product.images && product.images.length > 1
  const [isHovered, setIsHovered] = useState(false)
  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    addToCart({
      productId: product.id, name: product.name, price: product.price,
      image: hasImage ? product.images[0] : '', quantity: 1,
      size: product.sizes?.[0], color: product.colors?.[0],
    })
    openCart()
  }, [product, addToCart, openCart, hasImage])
  const handleToggleWishlist = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (isWishlisted) removeWishlist(product.id)
    else addWishlist({ productId: product.id, name: product.name, price: product.price, image: hasImage ? product.images[0] : '', addedAt: new Date().toISOString() })
  }, [product, isWishlisted, addWishlist, removeWishlist, hasImage])
  return (
    <motion.div
      ref={ref}
      custom={index}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={cardVariants}
      className="group cursor-pointer"
      onClick={() => setQuickView(product.id)}
      onMouseEnter={() => { setIsHovered(true); setCurrentImage(0) }}
      onMouseLeave={() => { setIsHovered(false); setCurrentImage(0) }}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[#F0EFED] mb-3">
        {hasImage ? (
          <>
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <AnimatePresence mode="wait">
              <motion.img
                key={currentImage}
                src={product.images[1]}
                alt={`${product.name} alternate`}
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.5 }}
              />
            </AnimatePresence>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ShoppingBag className="w-12 h-12" />
          </div>
        )}

        {/* Hover overlay gradient */}
        <motion.div
          className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-500 flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100"
          initial={{ opacity: 0 }}
          animate={{ opacity: showActions ? 1 : 0, duration: 0.4 }}
        >
          {/* Badges */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
            {product.bestSeller && (
              <span className="bg-[#C9A96E] text-black text-[9px] uppercase tracking-[0.15em] px-2.5 py-1 font-[\'Inter\'] font-medium">Best Seller</span>
            )}
            {!product.bestSeller && product.newArrival && (
              <span className="bg-white text-black text-[9px] uppercase tracking-[0.15em] px-2.5 py-1 font-\'Inter\'] font-medium">New</span>
            )}
            {product.comparePrice && !product.bestSeller && !product.newArrival && (
              <span className="bg-red-600 text-white text-[9px] uppercase tracking-[0.15em] px-2.5 py-1 font-\'Inter\'] font-medium">Sale</span>
            )}
          </div>

          {/* Action buttons */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 p-3 z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: showActions ? 1 : 0, y: showActions ? 0 : 20, duration: 0.4, delay: 0.05 }}
          >
            <div className="flex gap-2">
              <button
                onClick={handleAddToCart}
                className="flex-1 bg-white text-black py-2.5 text-[10px] uppercase tracking-[0.15em] font-['Inter'] font-medium hover:bg-[#C9A96E] hover:text-white transition-all duration-300 cursor-pointer"
              >Add to Bag</button>
              <button
                onClick={(e) => { e.stopPropagation(); setQuickView(product.id) }}
                className="w-10 bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white hover:text-black transition-all duration-300 flex items-center justify-center cursor-pointer"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Compare button */
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8, transition: { duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-3 right-14 z-10 w-9 h-9 flex items-center justify-center bg-white/90 rounded-full shadow-lg text-black hover:bg-[#C9A96E] hover:text-white transition-all duration-300"
            aria-label="Compare"
          >
            <GitCompareArrows className="w-3.5 h-3.5" />
          </motion.button>

          {/* Wishlist */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleToggleWishlist}
            className={`absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full shadow-lg transition-all duration-300 ${
              isWishlisted
                ? 'bg-[#C9A96E] text-white'
                : showActions
                ? 'bg-white/90 text-black shadow-lg'
                : 'bg-white/0 text-transparent'
            }`}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
          </motion.button>

          {/* Image navigation dots */
          {hasMultipleImages && showActions && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
              {product.images!.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setCurrentImage(i) }}
                  className={`h-1 rounded-full transition-all duration-300 ${currentImage === i ? 'w-4 bg-white' : 'w-1 bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Info */
        <div className="space-y-1 px-0.5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#C9A96E] font-['Inter'] font-medium">
            {product.brand?.name || 'MAISON'}
          </p>
          <h3 className="font-['Playfair_Display'] text-[15px] leading-tight group-hover:text-[#C9A96E] transition-colors duration-300">
            {product.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm font-['Inter'] font-medium text-[#0A0A0A]">
              ${product.price.toLocaleString()}
            </span>
            {product.comparePrice && (
              <span className="text-sm text-gray-400 line-through font-['Inter']">
                ${product.comparePrice.toLocaleString()}
              </span>
            )}
          </div>
          {/* Color swatches */
          {product.colors && product.colors.length > 0 && (
            <div className="flex gap-1.5 pt-1">
              {product.colors.slice(0, 5).map((color) => (
                <span
                  key={color}
                  className="w-3 h-3 rounded-full border border-black/10"
                  style={{ backgroundColor: color.toLowerCase() === 'black' ? '#1a1a1a' : color.toLowerCase() === 'white' ? '#f5f5f5' : color.toLowerCase() === 'navy' ? '#1e293b' : color.toLowerCase() === 'brown' ? '#92400e' : color.toLowerCase() === 'beige' ? '#d4c5a9' : color.toLowerCase() === 'gold' ? '#C9A96E' : color.toLowerCase() === 'burgundy' ? '#7f1d1d' : color.toLowerCase() === 'red' ? '#dc2626' : color.toLowerCase() === 'blue' ? '#3b82f6' : color.toLowerCase() === 'pink' ? '#ec4899' : color.toLowerCase() === 'grey' ? '#6b7280' : '#999' }}
                  title={color}
                />
              ))}
              {product.colors.length > 5 && <span className="text-[10px] text-gray-400 font-['Inter']">+{product.colors.length - 5}</span>}
            </div>
          )}
        </div>
    </motion.div>
  )
}
export function SkeletonGrid() {
  return (
    <div className="py-16 md:py-24 px-6 md:px-12 lg:px-24 bg-[#FAFAFA]">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[3/4] bg-gray-200 mb-4 rounded-sm" />
            <div className="space-y-2 mt-3">
              <div className="h-2.5 w-16 bg-gray-200 rounded" />
              <div className="h-4 w-3/4 bg-gray-200 rounded" />
              <div className="h-3.5 w-20 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
