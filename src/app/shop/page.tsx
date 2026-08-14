'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import StoreLayout from '@/components/layout/StoreLayout'
import ProductGrid, { SkeletonGrid } from '@/components/shared/ProductGrid'
import type { Product } from '@/types'
import { useCartStore } from '@/stores/cart-store'
import { useWishlistStore } from '@/stores/wishlist-store'
import { useUIStore } from '@/stores/ui-store'
import {
  SlidersHorizontal,
  ChevronDown,
  X,
  Check,
  Grid3X3,
  Grid2X2,
  List,
  Heart,
} from 'lucide-react'

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Name A-Z', value: 'name_asc' },
]

const BRAND_OPTIONS = [
  'Atelier Maison', 'Casa di Fiori', 'Étoile Paris', 'Nordic Luxe',
  'Sakura couture', 'The Heritage Co.', 'Velvet & Silk', 'Von Stein',
]

const COLOR_OPTIONS = [
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'White', hex: '#f5f5f5' },
  { name: 'Navy', hex: '#1e293b' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Burgundy', hex: '#7f1d1d' },
  { name: 'Brown', hex: '#92400e' },
  { name: 'Beige', hex: '#d4c5a9' },
  { name: 'Gold', hex: '#C9A96E' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Grey', hex: '#6b7280' },
]

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '34', '36', '38', '40', '42', '44']
const MATERIAL_OPTIONS = ['Silk', 'Cashmere', 'Wool', 'Cotton', 'Leather', 'Suede', 'Linen', 'Denim', 'Velvet']
const PRICE_RANGES = [
  { label: 'Under $500', min: 0, max: 500 },
  { label: '$500 - $1,000', min: 500, max: 1000 },
  { label: '$1,000 - $2,500', min: 1000, max: 2500 },
  { label: '$2,500 - $5,000', min: 2500, max: 5000 },
  { label: 'Over $5,000', min: 5000, max: Infinity },
]

export default function ShopPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('newest')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [gridCols, setGridCols] = useState<3 | 4>(4)

  // Filter state
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const [selectedPriceRange, setSelectedPriceRange] = useState<number | null>(null)
  const [inStockOnly, setInStockOnly] = useState(false)

  // Open filter sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    brand: true,
    price: true,
    color: false,
    size: false,
    material: false,
    availability: false,
  })

  useEffect(() => {
    let cancelled = false
    const fetchProducts = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/products?sort=${sort}&limit=50`)
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        if (!cancelled) setAllProducts(data.products || [])
      } catch { /* empty */ }
      if (!cancelled) setLoading(false)
    }
    fetchProducts()
    return () => { cancelled = true }
  }, [sort])

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    )
  }

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    )
  }

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    )
  }

  const toggleMaterial = (material: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(material) ? prev.filter((m) => m !== material) : [...prev, material]
    )
  }

  const clearAllFilters = () => {
    setSelectedBrands([])
    setSelectedColors([])
    setSelectedSizes([])
    setSelectedMaterials([])
    setSelectedPriceRange(null)
    setInStockOnly(false)
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (selectedBrands.length > 0) count++
    if (selectedColors.length > 0) count++
    if (selectedSizes.length > 0) count++
    if (selectedMaterials.length > 0) count++
    if (selectedPriceRange !== null) count++
    if (inStockOnly) count++
    return count
  }, [selectedBrands, selectedColors, selectedSizes, selectedMaterials, selectedPriceRange, inStockOnly])

  // Apply filters
  const filteredProducts = useMemo(() => {
    let products = [...allProducts]

    if (selectedBrands.length > 0) {
      products = products.filter((p) => p.brand?.name && selectedBrands.includes(p.brand.name))
    }

    if (selectedColors.length > 0) {
      products = products.filter((p) =>
        p.colors?.some((c) => selectedColors.includes(c))
      )
    }

    if (selectedSizes.length > 0) {
      products = products.filter((p) =>
        p.sizes?.some((s) => selectedSizes.includes(s))
      )
    }

    if (selectedMaterials.length > 0) {
      products = products.filter((p) =>
        p.material && selectedMaterials.some((m) => p.material?.toLowerCase().includes(m.toLowerCase()))
      )
    }

    if (selectedPriceRange !== null) {
      const range = PRICE_RANGES[selectedPriceRange]
      products = products.filter((p) => p.price >= range.min && p.price <= range.max)
    }

    if (inStockOnly) {
      products = products.filter((p) => p.stock > 0)
    }

    // Sort
    switch (sort) {
      case 'price_asc':
        products.sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        products.sort((a, b) => b.price - a.price)
        break
      case 'name_asc':
        products.sort((a, b) => a.name.localeCompare(b.name))
        break
      default:
        products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    return products
  }, [allProducts, sort, selectedBrands, selectedColors, selectedSizes, selectedMaterials, selectedPriceRange, inStockOnly])

  const FilterSidebar = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-['Inter'] text-xs uppercase tracking-[0.2em] text-[#0A0A0A] font-semibold">
          Filters
        </h3>
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="font-['Inter'] text-[10px] uppercase tracking-wider text-[#C9A96E] hover:text-black transition-colors"
          >
            Clear All ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Active filter pills */}
      <AnimatePresence>
        {activeFilterCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-1.5"
          >
            {selectedBrands.map((b) => (
              <FilterPill key={b} label={b} onRemove={() => toggleBrand(b)} />
            ))}
            {selectedColors.map((c) => (
              <FilterPill key={c} label={c} onRemove={() => toggleColor(c)} />
            ))}
            {selectedSizes.map((s) => (
              <FilterPill key={s} label={s} onRemove={() => toggleSize(s)} />
            ))}
            {selectedMaterials.map((m) => (
              <FilterPill key={m} label={m} onRemove={() => toggleMaterial(m)} />
            ))}
            {selectedPriceRange !== null && (
              <FilterPill
                label={PRICE_RANGES[selectedPriceRange].label}
                onRemove={() => setSelectedPriceRange(null)}
              />
            )}
            {inStockOnly && (
              <FilterPill label="In Stock" onRemove={() => setInStockOnly(false)} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brand Filter */}
      <FilterSection title="Brand" section="brand" open={openSections.brand} onToggle={() => toggleSection('brand')}>
        <div className="space-y-2">
          {BRAND_OPTIONS.map((brand) => (
            <label
              key={brand}
              className="flex items-center gap-3 cursor-pointer group py-0.5"
            >
              <div
                className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all duration-200 ${
                  selectedBrands.includes(brand)
                    ? 'bg-[#0A0A0A] border-[#0A0A0A]'
                    : 'border-gray-300 group-hover:border-gray-500'
                }`}
                onClick={() => toggleBrand(brand)}
              >
                {selectedBrands.includes(brand) && (
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                )}
              </div>
              <span className="font-['Inter'] text-sm text-gray-700 group-hover:text-black transition-colors">
                {brand}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Price Filter */}
      <FilterSection title="Price" section="price" open={openSections.price} onToggle={() => toggleSection('price')}>
        <div className="space-y-2">
          {PRICE_RANGES.map((range, i) => (
            <label
              key={range.label}
              className="flex items-center gap-3 cursor-pointer group py-0.5"
            >
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  selectedPriceRange === i
                    ? 'border-[#C9A96E]'
                    : 'border-gray-300 group-hover:border-gray-500'
                }`}
                onClick={() => setSelectedPriceRange(selectedPriceRange === i ? null : i)}
              >
                {selectedPriceRange === i && (
                  <div className="w-2 h-2 rounded-full bg-[#C9A96E]" />
                )}
              </div>
              <span className="font-['Inter'] text-sm text-gray-700 group-hover:text-black transition-colors">
                {range.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Color Filter */}
      <FilterSection title="Color" section="color" open={openSections.color} onToggle={() => toggleSection('color')}>
        <div className="flex flex-wrap gap-2.5">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color.name}
              onClick={() => toggleColor(color.name)}
              title={color.name}
              className={`relative w-7 h-7 rounded-full border-2 transition-all duration-200 ${
                selectedColors.includes(color.name)
                  ? 'border-[#0A0A0A] scale-110'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <span
                className="absolute inset-1 rounded-full"
                style={{ backgroundColor: color.hex }}
              />
              {selectedColors.includes(color.name) && (
                <Check className={`absolute inset-0 m-auto w-3 h-3 ${color.name === 'White' || color.name === 'Beige' ? 'text-black' : 'text-white'}`} strokeWidth={3} />
              )}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Size Filter */}
      <FilterSection title="Size" section="size" open={openSections.size} onToggle={() => toggleSection('size')}>
        <div className="flex flex-wrap gap-1.5">
          {SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              onClick={() => toggleSize(size)}
              className={`min-w-[40px] h-9 px-2 text-center font-['Inter'] text-xs border transition-all duration-200 ${
                selectedSizes.includes(size)
                  ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                  : 'border-gray-200 text-gray-700 hover:border-gray-500'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Material Filter */}
      <FilterSection title="Material" section="material" open={openSections.material} onToggle={() => toggleSection('material')}>
        <div className="flex flex-wrap gap-1.5">
          {MATERIAL_OPTIONS.map((material) => (
            <button
              key={material}
              onClick={() => toggleMaterial(material)}
              className={`h-8 px-3 text-center font-['Inter'] text-xs border transition-all duration-200 ${
                selectedMaterials.includes(material)
                  ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
                  : 'border-gray-200 text-gray-700 hover:border-gray-500'
              }`}
            >
              {material}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Availability */}
      <FilterSection title="Availability" section="availability" open={openSections.availability} onToggle={() => toggleSection('availability')}>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div
            className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all duration-200 ${
              inStockOnly
                ? 'bg-[#0A0A0A] border-[#0A0A0A]'
                : 'border-gray-300 group-hover:border-gray-500'
            }`}
            onClick={() => setInStockOnly(!inStockOnly)}
          >
            {inStockOnly && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
          </div>
          <span className="font-['Inter'] text-sm text-gray-700 group-hover:text-black transition-colors">
            In Stock Only
          </span>
        </label>
      </FilterSection>
    </div>
  )

  return (
    <StoreLayout>
      {/* Hero Banner */}
      <div className="bg-[#0A0A0A] py-24 md:py-32 px-6 text-center relative overflow-hidden">
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-['Inter'] text-[10px] tracking-[0.3em] uppercase text-[#C9A96E] mb-4"
          >
            Discover
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-['Playfair_Display'] text-4xl md:text-6xl text-white mb-4 font-light"
          >
            All Collections
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-['Inter'] text-white/50 text-sm max-w-md mx-auto"
          >
            Explore our complete curated selection of luxury fashion, accessories, and lifestyle pieces.
          </motion.p>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-12 h-px bg-[#C9A96E] mx-auto mt-6"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-100 px-6 md:px-12 lg:px-24 sticky top-8 lg:top-[104px] z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-3.5">
          <div className="flex items-center gap-4">
            {/* Mobile filter toggle */}
            <button
              onClick={() => setFiltersOpen(true)}
              className="lg:hidden flex items-center gap-2 font-['Inter'] text-xs tracking-wider uppercase text-gray-600"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#0A0A0A] text-white text-[10px] flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <p className="hidden sm:block font-['Inter'] text-xs text-gray-500">
              {loading ? 'Loading...' : `${filteredProducts.length} piece${filteredProducts.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Grid toggle */}
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setGridCols(4)}
                className={`p-1.5 transition-colors ${gridCols === 4 ? 'text-black' : 'text-gray-300'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setGridCols(3)}
                className={`p-1.5 transition-colors ${gridCols === 3 ? 'text-black' : 'text-gray-300'}`}
              >
                <Grid2X2 className="w-4 h-4" />
              </button>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="font-['Inter'] text-xs tracking-wider uppercase text-gray-600 bg-transparent border-none outline-none cursor-pointer appearance-none pr-5"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-gray-400 -ml-3.5 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="bg-[#FAFAFA] min-h-[60vh]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24">
          <div className="flex gap-10 py-10 md:py-16">
            {/* Desktop Filter Sidebar */}
            <aside className="hidden lg:block w-56 flex-shrink-0">
              <div className="sticky top-36">
                <FilterSidebar />
              </div>
            </aside>

            {/* Product Grid */}
            <div className="flex-1">
              {loading ? (
                <SkeletonGrid />
              ) : filteredProducts.length > 0 ? (
                <div className={`grid gap-4 md:gap-6 ${gridCols === 4 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                  {filteredProducts.map((product, index) => (
                    <ProductCardCompact key={product.id} product={product} index={index} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-24">
                  <p className="font-['Playfair_Display'] text-2xl text-gray-400 mb-2">No matches found</p>
                  <p className="font-['Inter'] text-sm text-gray-400 mb-6">Try adjusting your filters</p>
                  <button
                    onClick={clearAllFilters}
                    className="font-['Inter'] text-xs uppercase tracking-widest px-6 py-3 border border-[#0A0A0A] text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white transition-all duration-300"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <AnimatePresence>
        {filtersOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFiltersOpen(false)}
            />
            <motion.aside
              className="fixed top-0 left-0 bottom-0 z-[71] w-[320px] max-w-[85vw] bg-white overflow-y-auto shadow-2xl"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h2 className="font-['Inter'] text-xs uppercase tracking-[0.2em] font-semibold">
                  Filters
                </h2>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="text-gray-400 hover:text-black transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5">
                <FilterSidebar />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </StoreLayout>
  )
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function FilterSection({ title, section, open, onToggle, children }: {
  title: string; section: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className="border-t border-gray-100 pt-4">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full mb-3 group"
      >
        <span className="font-['Inter'] text-[11px] uppercase tracking-[0.15em] text-gray-900 font-medium">
          {title}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-sm font-['Inter'] text-[11px] text-gray-700"
    >
      {label}
      <button onClick={onRemove} className="text-gray-400 hover:text-black transition-colors">
        <X className="w-3 h-3" />
      </button>
    </motion.span>
  )
}

function ProductCardCompact({ product, index }: { product: Product; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const hydrated = useHydrated()
  const addToCart = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)
  const { addItem: addWishlist, removeItem: removeWishlist, isInWishlist } = useWishlistStore()
  const setQuickView = useUIStore((s) => s.setQuickViewProduct)

  const isWishlisted = isInWishlist(product.id)
  const hasImage = product.images && product.images.length > 0
  const [isHovered, setIsHovered] = useState(false)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    addToCart({
      productId: product.id, name: product.name, price: product.price,
      image: hasImage ? product.images[0] : '', quantity: 1,
      size: product.sizes?.[0], color: product.colors?.[0],
    })
    openCart()
  }

  return (
    <motion.div
      ref={ref}
      initial={{ y: 40, opacity: 0 }}
      animate={isInView ? { y: 0, opacity: 1 } : {}}
      transition={{ delay: index * 0.04, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group cursor-pointer"
      onClick={() => setQuickView(product.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[#F0EFED] mb-3">
        {hasImage ? (
          <>
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {product.images.length > 1 && (
              <img
                src={product.images[1]}
                alt={`${product.name} alternate`}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
                style={{ opacity: isHovered ? 1 : 0 }}
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <List className="w-12 h-12" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-all duration-500 flex items-end justify-center pb-5 opacity-0 group-hover:opacity-100">
          <button
            onClick={handleAddToCart}
            className="bg-white text-black px-5 py-2.5 text-[10px] uppercase tracking-[0.15em] font-['Inter'] font-medium hover:bg-[#C9A96E] hover:text-white transition-all duration-300 transform translate-y-3 group-hover:translate-y-0 cursor-pointer"
          >
            Add to Bag
          </button>
        </div>

        {/* Wishlist */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (isWishlisted) removeWishlist(product.id)
            else addWishlist({ productId: product.id, name: product.name, price: product.price, image: hasImage ? product.images[0] : '', addedAt: new Date().toISOString() })
          }}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 z-10 ${
            isWishlisted
              ? 'bg-[#C9A96E] text-white'
              : 'bg-white/0 group-hover:bg-white/90 text-transparent group-hover:text-black'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>

        {/* Badges */}
        {product.bestSeller && (
          <span className="absolute top-3 left-3 bg-[#C9A96E] text-black text-[9px] uppercase tracking-[0.15em] px-2.5 py-1 font-['Inter'] font-medium z-10">
            Best Seller
          </span>
        )}
        {!product.bestSeller && product.newArrival && (
          <span className="absolute top-3 left-3 bg-white text-black text-[9px] uppercase tracking-[0.15em] px-2.5 py-1 font-['Inter'] font-medium z-10">
            New
          </span>
        )}
      </div>

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
      </div>
    </motion.div>
  )
}
