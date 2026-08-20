'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, useInView } from 'framer-motion'
import { Heart, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import type { Product } from '@/types'
import { useCartStore } from '@/stores/cart-store'
import { useWishlistStore } from '@/stores/wishlist-store'
import { useUIStore } from '@/stores/ui-store'

const cardVariants = {
  hidden: { y: 50, opacity: 0, scale: 0.96 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.7,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

function ProductCard({ product }: { product: Product }) {
  const addToCart = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)
  const { addItem: addWishlist, removeItem: removeWishlist, isInWishlist } = useWishlistStore()
  const setQuickView = useUIStore((s) => s.setQuickViewProduct)

  const isWishlisted = isInWishlist(product.id)
  const hasImage = product.images && product.images.length > 0

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: hasImage ? product.images[0] : '',
      quantity: 1,
      size: product.sizes?.[0],
      color: product.colors?.[0],
    })
    openCart()
  }

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isWishlisted) {
      removeWishlist(product.id)
    } else {
      addWishlist({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: hasImage ? product.images[0] : '',
        addedAt: new Date().toISOString(),
      })
    }
  }

  return (
    <div
      className="group cursor-pointer flex-shrink-0 w-[280px] sm:w-[300px] md:w-[320px] lg:w-[360px]"
      onClick={() => setQuickView(product.id)}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[#1A1A1A] mb-4 border border-white/5 group-hover:border-[#C9A96E]/30 transition-colors duration-500">
        {hasImage ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-16 h-16 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-500 flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100 gap-3">
          <button
            onClick={handleAddToCart}
            className="bg-white text-black px-5 py-2.5 text-[11px] uppercase tracking-widest font-['Inter'] hover:bg-[#C9A96E] hover:text-white transition-all duration-300 cursor-pointer"
          >
            Add to Bag
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setQuickView(product.id) }}
            className="bg-white/10 backdrop-blur-sm text-white px-5 py-2.5 text-[11px] uppercase tracking-widest font-['Inter'] border border-white/20 hover:bg-white hover:text-black transition-all duration-300 cursor-pointer"
          >
            View
          </button>
        </div>

        {/* Wishlist */}
        <button
          onClick={handleToggleWishlist}
          className="absolute top-4 right-4 w-9 h-9 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-[#C9A96E] transition-colors duration-300 z-10 cursor-pointer"
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart
            className={`w-3.5 h-3.5 transition-colors duration-300 ${isWishlisted ? 'fill-[#C9A96E] text-[#C9A96E]' : 'text-white'}`}
          />
        </button>

        {/* Brand badge */}
        <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <p className="text-[9px] uppercase tracking-widest text-white/70 font-['Inter']">
            {product.brand?.name}
          </p>
        </div>
      </div>

      <div className="space-y-1 px-1">
        <p className="text-[10px] uppercase tracking-widest text-[#C9A96E] font-['Inter']">
          {product.brand?.name}
        </p>
        <h3 className="font-['Playfair_Display'] text-sm text-white group-hover:text-[#C9A96E] transition-colors duration-300 truncate">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/90 font-['Inter']">${product.price.toLocaleString()}</span>
          {product.comparePrice && (
            <span className="text-sm text-white/40 line-through font-['Inter']">
              ${product.comparePrice.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="animate-pulse flex-shrink-0 w-[280px] sm:w-[300px] md:w-[320px] lg:w-[360px]">
      <div className="relative aspect-[3/4] overflow-hidden bg-[#1A1A1A] mb-4">
        <div className="w-full h-full bg-[#1A1A1A]" />
      </div>
      <div className="space-y-2 px-1">
        <div className="h-3 w-16 bg-[#1A1A1A] rounded" />
        <div className="h-4 w-3/4 bg-[#1A1A1A] rounded" />
        <div className="h-4 w-20 bg-[#1A1A1A] rounded" />
      </div>
    </div>
  )
}

export default function DesignerCollections() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })
  const headerRef = useRef<HTMLDivElement>(null)
  const isHeaderInView = useInView(headerRef, { once: true, margin: '-60px' })
  const scrollRef = useRef<HTMLDivElement>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 10)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    const resizeObserver = new ResizeObserver(checkScroll)
    resizeObserver.observe(el)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      resizeObserver.disconnect()
    }
  }, [checkScroll])

  const scroll = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.querySelector<HTMLDivElement>(':scope > div')?.offsetWidth || 320
    const scrollAmount = cardWidth * 1.5
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products?featured=true&limit=8')
        if (!res.ok) throw new Error('Failed to fetch products')
        const data = await res.json()
        if (!cancelled) {
          setProducts(data.products || [])
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Something went wrong')
          setLoading(false)
        }
      }
    }
    fetchProducts()
    return () => { cancelled = true }
  }, [])

  return (
    <section
      ref={sectionRef}
      className="py-32 px-6 md:px-12 lg:px-24 bg-white"
      aria-label="Designer Collections"
    >
      {/* Section Header */}
      <div ref={headerRef} className="flex items-end justify-between mb-12">
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="font-['Playfair_Display'] text-4xl md:text-5xl text-[#0A0A0A] mb-4"
          >
            Designer Collections
          </motion.h2>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={isHeaderInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            className="w-12 h-px bg-[#C9A96E] mb-4"
          />
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            className="font-['Inter'] text-gray-500 text-sm md:text-base max-w-md"
          >
            Curated selections from the world&apos;s most esteemed houses
          </motion.p>
        </div>

        {/* Navigation arrows */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={isHeaderInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="hidden md:flex items-center gap-3"
        >
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="w-11 h-11 rounded-full border border-[#0A0A0A]/20 flex items-center justify-center hover:bg-[#0A0A0A] hover:text-white transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="w-11 h-11 rounded-full border border-[#0A0A0A]/20 flex items-center justify-center hover:bg-[#0A0A0A] hover:text-white transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>

      {/* Carousel container with dark bg */}
      <div className="relative -mx-6 md:-mx-12 lg:-mx-24 bg-[#0A0A0A] py-12 px-6 md:px-12 lg:px-24">
        {error ? (
          <div className="text-center py-16">
            <p className="font-['Inter'] text-white/40 text-sm">{error}</p>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto pb-4 no-scrollbar"
          >
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
              : products.map((product, index) => (
                  <motion.div
                    key={product.id}
                    custom={index}
                    initial="hidden"
                    animate={isInView ? 'visible' : 'hidden'}
                    variants={cardVariants}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
          </div>
        )}
      </div>

      {/* View All Link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="text-center mt-12"
      >
        <button className="inline-flex items-center gap-3 font-['Inter'] text-sm uppercase tracking-widest text-[#0A0A0A] hover:text-[#C9A96E] transition-colors duration-300 cursor-pointer group">
          View All Collections
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </motion.div>
    </section>
  )
}
