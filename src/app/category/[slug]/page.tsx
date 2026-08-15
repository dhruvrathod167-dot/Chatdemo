'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import StoreLayout from '@/components/layout/StoreLayout'
import ProductGrid, { SkeletonGrid } from '@/components/shared/ProductGrid'
import type { Product } from '@/types'
import Link from 'next/link'

const CATEGORY_META: Record<string, { title: string; subtitle: string; hero: string }> = {
  women: { title: 'Women', subtitle: 'Haute couture, ready-to-wear, and timeless elegance for the modern woman.', hero: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1600&h=600&fit=crop' },
  men: { title: 'Men', subtitle: 'Impeccably tailored suiting, refined casualwear, and essential luxury pieces.', hero: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1600&h=600&fit=crop' },
  accessories: { title: 'Accessories', subtitle: 'Scarves, belts, and sunglasses from the world\'s finest ateliers.', hero: 'https://images.unsplash.com/photo-1601924921557-45e8e1af0014?w=1600&h=600&fit=crop' },
  shoes: { title: 'Shoes', subtitle: 'From sculptural heels to minimalist sneakers, each pair is a masterwork.', hero: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=1600&h=600&fit=crop' },
  bags: { title: 'Bags', subtitle: 'Quilted shoulder bags, leather totes, and travel companions.', hero: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1600&h=600&fit=crop' },
  jewelry: { title: 'Jewelry', subtitle: 'Swiss chronographs and fine timepieces for the discerning collector.', hero: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=1600&h=600&fit=crop' },
}

const ALL_CATEGORIES = ['women', 'men', 'accessories', 'shoes', 'bags', 'jewelry']

export default function CategoryPage() {
  const params = useParams()
  const slug = (params?.slug as string) || ''
  const meta = CATEGORY_META[slug]
  const [products, setProducts] = useState<Product[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    const fetchProducts = async () => {
      try {
        const res = await fetch(`/api/products?category=${slug}&limit=50`)
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        if (!cancelled) setProducts(data.products || [])
      } catch { /* empty */ }
      if (!cancelled) setLoading(false)
    }
    fetchProducts()
    return () => { cancelled = true }
  }, [slug])

  // Fetch all products for fallback when category is empty
  useEffect(() => {
    let cancelled = false
    const fetchAll = async () => {
      try {
        const res = await fetch('/api/products?limit=50')
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        if (!cancelled) setAllProducts(data.products || [])
      } catch { /* empty */ }
    }
    fetchAll()
    return () => { cancelled = true }
  }, [])

  // If category has no products, show fallback recommendations
  const displayProducts = products.length > 0 ? products : allProducts.slice(0, 12)
  const isShowingFallback = products.length === 0 && allProducts.length > 0

  if (!meta) {
    return (
      <StoreLayout>
        <div className="py-32 text-center px-6">
          <h1 className="font-['Playfair_Display'] text-4xl text-[#0A0A0A] mb-4">Collection Not Found</h1>
          <p className="font-['Inter'] text-gray-500 text-sm mb-8">The collection you are looking for does not exist.</p>
          <div className="flex flex-wrap justify-center gap-4">
            {ALL_CATEGORIES.map((c) => (
              <Link key={c} href={`/category/${c}`}
                className="font-['Inter'] text-xs uppercase tracking-widest px-6 py-3 border border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white transition-colors duration-300">
                {c}
              </Link>
            ))}
          </div>
        </div>
      </StoreLayout>
    )
  }

  return (
    <StoreLayout>
      {/* Hero */}
      <div className="relative h-[40vh] md:h-[50vh] overflow-hidden">
        <img src={meta.hero} alt={meta.title}
          className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-['Inter'] text-[10px] tracking-[0.3em] uppercase text-[#C9A96E] mb-4"
          >
            Collection
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-['Playfair_Display'] text-5xl md:text-7xl text-white mb-4 font-light"
          >
            {meta.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-['Inter'] text-white/60 text-sm max-w-md"
          >
            {meta.subtitle}
          </motion.p>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-12 h-px bg-[#C9A96E] mt-6"
          />
        </div>
      </div>

      {/* Category nav */}
      <div className="bg-white border-b border-gray-100 px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto flex items-center gap-8 py-4 overflow-x-auto">
          {ALL_CATEGORIES.map((c) => (
            <Link key={c} href={`/category/${c}`}
              className={`font-['Inter'] text-xs uppercase tracking-widest whitespace-nowrap transition-colors duration-300 pb-1 ${c === slug ? 'text-[#C9A96E] border-b border-[#C9A96E]' : 'text-gray-400 hover:text-[#0A0A0A]'}`}>
              {c}
            </Link>
          ))}
        </div>
      </div>

      {isShowingFallback && !loading && (
        <div className="bg-[#C9A96E]/5 border-b border-[#C9A96E]/10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <p className="font-['Inter'] text-sm text-[#C9A96E]">
              No pieces found in this collection yet. Showing curated recommendations from our other collections.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonGrid />
      ) : isShowingFallback ? (
        <ProductGrid
          products={displayProducts}
          title="Recommended For You"
          subtitle="Curated from our finest collections"
        />
      ) : (
        <ProductGrid products={displayProducts} />
      )}
    </StoreLayout>
  )
}
