'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { Heart, ArrowRight } from 'lucide-react'
import type { Product } from '@/types'
import { useCartStore } from '@/stores/cart-store'
import { useWishlistStore } from '@/stores/wishlist-store'
import { useUIStore } from '@/stores/ui-store'

const cardVariants = {
  hidden: { y: 60, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.7,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

function ProductCard({ product, index, isInView }: { product: Product; index: number; isInView: boolean }) {
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

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation()
    setQuickView(product.id)
  }

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={cardVariants}
      className="group cursor-pointer flex-shrink-0 snap-start lg:flex-shrink-1"
      onClick={() => setQuickView(product.id)}
      style={{ width: 'calc(50% - 12px)', minWidth: 'calc(50% - 12px)' }}
    >
      {/* Desktop: full width card within grid */}
      <div className="lg:w-auto lg:min-w-0">
        <div className="relative aspect-[3/4] overflow-hidden bg-[#1A1A1A] mb-4 border border-transparent group-hover:border-[#C9A96E]/40 transition-colors duration-500">
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
              className="bg-white text-black px-6 py-3 text-xs uppercase tracking-widest font-['Inter'] hover:bg-[#C9A96E] hover:text-white transition-all duration-300 cursor-pointer"
            >
              Add to Bag
            </button>
            <button
              onClick={handleQuickView}
              className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 text-xs uppercase tracking-widest font-['Inter'] border border-white/20 hover:bg-white hover:text-black transition-all duration-300 cursor-pointer"
            >
              Quick View
            </button>
          </div>

          {/* Wishlist heart button */}
          <button
            onClick={handleToggleWishlist}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-[#C9A96E] transition-colors duration-300 z-10 cursor-pointer"
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart
              className={`w-4 h-4 transition-colors duration-300 ${isWishlisted ? 'fill-[#C9A96E] text-[#C9A96E]' : 'text-white'}`}
            />
          </button>

          {/* Badges */}
          {product.trending && (
            <span className="absolute top-4 left-4 bg-[#C9A96E] text-black text-[10px] uppercase tracking-widest px-3 py-1 font-['Inter']">
              Trending
            </span>
          )}
          {product.bestSeller && (
            <span className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm text-white text-[10px] uppercase tracking-widest px-3 py-1 font-['Inter']">
              Best Seller
            </span>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-[#C9A96E] font-['Inter']">
            {product.brand?.name}
          </p>
          <h3 className="font-['Playfair_Display'] text-base text-white group-hover:text-[#C9A96E] transition-colors duration-300">
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
    </motion.div>
  )
}

function SkeletonCard() {
  return (
    <div className="animate-pulse flex-shrink-0 snap-start" style={{ width: 'calc(50% - 12px)', minWidth: 'calc(50% - 12px)' }}>
      <div className="relative aspect-[3/4] overflow-hidden bg-[#1A1A1A] mb-4">
        <div className="w-full h-full bg-[#1A1A1A]" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-16 bg-[#1A1A1A] rounded" />
        <div className="h-5 w-3/4 bg-[#1A1A1A] rounded" />
        <div className="h-4 w-20 bg-[#1A1A1A] rounded" />
      </div>
    </div>
  )
}

export default function TrendingProducts() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })
  const headerRef = useRef<HTMLDivElement>(null)
  const isHeaderInView = useInView(headerRef, { once: true, margin: '-60px' })
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products?trending=true&limit=4')
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
      className="py-32 px-6 md:px-12 lg:px-24 bg-[#0A0A0A]"
      aria-label="Trending Products"
    >
      {/* Section Header */}
      <div ref={headerRef} className="text-center mb-16">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="font-['Playfair_Display'] text-4xl md:text-5xl text-white mb-4"
        >
          Trending Now
        </motion.h2>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={isHeaderInView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="w-12 h-px bg-[#C9A96E] mx-auto mb-4"
        />
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className="font-['Inter'] text-white/50 text-sm md:text-base"
        >
          The pieces everyone is talking about this season
        </motion.p>
      </div>

      {/* Product Grid — Horizontal scroll on mobile, 4-col grid on desktop */}
      {error ? (
        <div className="text-center py-16">
          <p className="font-['Inter'] text-white/40 text-sm">{error}</p>
        </div>
      ) : (
        <>
          {/* Mobile: Horizontal scroll */}
          <div
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 lg:hidden no-scrollbar"
          >
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : products.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} isInView={isInView} />
                ))}
          </div>

          {/* Desktop: 4-column grid */}
          <div className="hidden lg:grid grid-cols-4 gap-8">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="relative aspect-[3/4] overflow-hidden bg-[#1A1A1A] mb-4">
                      <div className="w-full h-full bg-[#1A1A1A]" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-16 bg-[#1A1A1A] rounded" />
                      <div className="h-5 w-3/4 bg-[#1A1A1A] rounded" />
                      <div className="h-4 w-20 bg-[#1A1A1A] rounded" />
                    </div>
                  </div>
                ))
              : products.map((product, index) => (
                  <motion.div
                    key={product.id}
                    custom={index}
                    initial="hidden"
                    animate={isInView ? 'visible' : 'hidden'}
                    variants={cardVariants}
                    className="group cursor-pointer"
                    onClick={() => useUIStore.getState().setQuickViewProduct(product.id)}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-[#1A1A1A] mb-4 border border-transparent group-hover:border-[#C9A96E]/40 transition-colors duration-500">
                      {product.images && product.images.length > 0 ? (
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
                          onClick={(e) => {
                            e.stopPropagation()
                            useCartStore.getState().addItem({
                              productId: product.id,
                              name: product.name,
                              price: product.price,
                              image: product.images?.[0] || '',
                              quantity: 1,
                              size: product.sizes?.[0],
                              color: product.colors?.[0],
                            })
                            useCartStore.getState().openCart()
                          }}
                          className="bg-white text-black px-6 py-3 text-xs uppercase tracking-widest font-['Inter'] hover:bg-[#C9A96E] hover:text-white transition-all duration-300 cursor-pointer"
                        >
                          Add to Bag
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            useUIStore.getState().setQuickViewProduct(product.id)
                          }}
                          className="bg-white/10 backdrop-blur-sm text-white px-6 py-3 text-xs uppercase tracking-widest font-['Inter'] border border-white/20 hover:bg-white hover:text-black transition-all duration-300 cursor-pointer"
                        >
                          Quick View
                        </button>
                      </div>

                      {/* Wishlist */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const wl = useWishlistStore.getState()
                          if (wl.isInWishlist(product.id)) {
                            wl.removeItem(product.id)
                          } else {
                            wl.addItem({
                              productId: product.id,
                              name: product.name,
                              price: product.price,
                              image: product.images?.[0] || '',
                              addedAt: new Date().toISOString(),
                            })
                          }
                        }}
                        className="absolute top-4 right-4 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-[#C9A96E] transition-colors duration-300 z-10 cursor-pointer"
                      >
                        <Heart
                          className={`w-4 h-4 transition-colors duration-300 ${useWishlistStore.getState().isInWishlist(product.id) ? 'fill-[#C9A96E] text-[#C9A96E]' : 'text-white'}`}
                        />
                      </button>

                      {/* Badge */}
                      {product.trending && (
                        <span className="absolute top-4 left-4 bg-[#C9A96E] text-black text-[10px] uppercase tracking-widest px-3 py-1 font-['Inter']">
                          Trending
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-widest text-[#C9A96E] font-['Inter']">
                        {product.brand?.name}
                      </p>
                      <h3 className="font-['Playfair_Display'] text-base text-white group-hover:text-[#C9A96E] transition-colors duration-300">
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
                  </motion.div>
                ))}
          </div>
        </>
      )}

      {/* View All Link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="text-center mt-16"
      >
        <button className="inline-flex items-center gap-3 font-['Inter'] text-sm uppercase tracking-widest text-white hover:text-[#C9A96E] transition-colors duration-300 cursor-pointer group">
          Explore Trending
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </motion.div>
    </section>
  )
}
