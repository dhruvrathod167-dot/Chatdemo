'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Heart, ShoppingBag } from 'lucide-react'
import type { Product } from '@/types'
import { useCartStore } from '@/stores/cart-store'
import { useWishlistStore } from '@/stores/wishlist-store'
import { useUIStore } from '@/stores/ui-store'

const cardVariants = {
  hidden: { y: 60, opacity: 0 },
  visible: (i: number) => ({
    y: 0, opacity: 1,
    transition: { delay: i * 0.05, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
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
          <h1 className="font-['Playfair_Display'] text-4xl md:text-5xl text-[#0A0A0A] mb-4">{title}</h1>
          {subtitle && <p className="font-['Inter'] text-gray-500 text-sm md:text-base">{subtitle}</p>}
          <div className="w-12 h-px bg-[#C9A96E] mx-auto mt-4" />
        </div>
      )}
      {products.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-['Inter'] text-gray-400 text-sm">No products found in this collection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
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
  const addToCart = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)
  const { addItem: addWishlist, removeItem: removeWishlist, isInWishlist } = useWishlistStore()
  const setQuickView = useUIStore((s) => s.setQuickViewProduct)

  const isWishlisted = isInWishlist(product.id)
  const hasImage = product.images && product.images.length > 0

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    addToCart({
      productId: product.id, name: product.name, price: product.price,
      image: hasImage ? product.images[0] : '', quantity: 1,
      size: product.sizes?.[0], color: product.colors?.[0],
    })
    openCart()
  }

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isWishlisted) { removeWishlist(product.id) }
    else {
      addWishlist({
        productId: product.id, name: product.name, price: product.price,
        image: hasImage ? product.images[0] : '', addedAt: new Date().toISOString(),
      })
    }
  }

  return (
    <motion.div
      ref={ref} custom={index}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={cardVariants}
      className="group cursor-pointer"
      onClick={() => setQuickView(product.id)}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[#F5F5F5] mb-4">
        {hasImage ? (
          <img src={product.images[0]} alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ShoppingBag className="w-12 h-12" />
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-500 flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100 gap-3">
          <button onClick={handleAddToCart}
            className="bg-white text-black px-5 py-2.5 text-xs uppercase tracking-widest font-['Inter'] hover:bg-[#C9A96E] hover:text-white transition-all duration-300 cursor-pointer">
            Add to Bag
          </button>
          <button onClick={(e) => { e.stopPropagation(); setQuickView(product.id) }}
            className="bg-white/10 backdrop-blur-sm text-white px-5 py-2.5 text-xs uppercase tracking-widest font-['Inter'] border border-white/20 hover:bg-white hover:text-black transition-all duration-300 cursor-pointer">
            Quick View
          </button>
        </div>

        <button onClick={handleToggleWishlist}
          className="absolute top-4 right-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-[#C9A96E] transition-colors duration-300 z-10 cursor-pointer">
          <Heart className={`w-4 h-4 transition-colors duration-300 ${isWishlisted ? 'fill-[#C9A96E] text-[#C9A96E]' : 'text-black'}`} />
        </button>

        {product.bestSeller && (
          <span className="absolute top-4 left-4 bg-[#C9A96E] text-black text-[10px] uppercase tracking-widest px-3 py-1 font-['Inter']">Best Seller</span>
        )}
        {!product.bestSeller && product.newArrival && (
          <span className="absolute top-4 left-4 bg-[#0A0A0A] text-white text-[10px] uppercase tracking-widest px-3 py-1 font-['Inter']">New</span>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-[#C9A96E] font-['Inter']">
          {product.brand?.name || 'MAISON'}
        </p>
        <h3 className="font-['Playfair_Display'] text-base group-hover:text-[#C9A96E] transition-colors duration-300">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-['Inter']">${product.price.toLocaleString()}</span>
          {product.comparePrice && (
            <span className="text-sm text-gray-400 line-through font-['Inter']">
              ${product.comparePrice.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export function SkeletonGrid() {
  return (
    <div className="py-16 md:py-24 px-6 md:px-12 lg:px-24 bg-[#FAFAFA]">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-[3/4] bg-gray-200 mb-4" />
            <div className="space-y-2">
              <div className="h-3 w-16 bg-gray-200 rounded" />
              <div className="h-5 w-3/4 bg-gray-200 rounded" />
              <div className="h-4 w-20 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
