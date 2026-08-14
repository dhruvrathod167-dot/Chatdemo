'use client'

import { useState, useEffect } from 'react'
import StoreLayout from '@/components/layout/StoreLayout'
import ProductGrid, { SkeletonGrid } from '@/components/shared/ProductGrid'
import type { Product } from '@/types'
import { SlidersHorizontal, ChevronDown } from 'lucide-react'

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Name A-Z', value: 'name_asc' },
]

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    let cancelled = false
    const fetchProducts = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/products?sort=${sort}&limit=50`)
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        if (!cancelled) setProducts(data.products || [])
      } catch { /* empty */ }
      if (!cancelled) setLoading(false)
    }
    fetchProducts()
    return () => { cancelled = true }
  }, [sort])

  return (
    <StoreLayout>
      {/* Hero Banner */}
      <div className="bg-[#0A0A0A] py-20 md:py-28 px-6 text-center">
        <p className="font-['Inter'] text-[10px] tracking-[0.3em] uppercase text-[#C9A96E] mb-4">Discover</p>
        <h1 className="font-['Playfair_Display'] text-4xl md:text-6xl text-white mb-4">All Collections</h1>
        <p className="font-['Inter'] text-white/50 text-sm max-w-md mx-auto">
          Explore our complete curated selection of luxury fashion, accessories, and lifestyle pieces.
        </p>
        <div className="w-12 h-px bg-[#C9A96E] mx-auto mt-6" />
      </div>

      {/* Sort Bar */}
      <div className="bg-white border-b border-gray-100 px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-4">
          <p className="font-['Inter'] text-xs text-gray-500">
            {loading ? 'Loading...' : `${products.length} pieces`}
          </p>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-gray-400" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="font-['Inter'] text-xs tracking-wider uppercase text-gray-600 bg-transparent border-none outline-none cursor-pointer appearance-none pr-6"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-gray-400 -ml-4 pointer-events-none" />
          </div>
        </div>
      </div>

      {loading ? <SkeletonGrid /> : <ProductGrid products={products} />}
    </StoreLayout>
  )
}
