'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Heart, ShoppingBag, Minus, Plus, ChevronRight } from 'lucide-react'
import StoreLayout from '@/components/layout/StoreLayout'
import { SkeletonGrid } from '@/components/shared/ProductGrid'
import { useCartStore } from '@/stores/cart-store'
import { useWishlistStore } from '@/stores/wishlist-store'
import type { Product } from '@/types'
import Link from 'next/link'

export default function ProductDetailPage() {
  const params = useParams()
  const slug = params?.slug as string
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [quantity, setQuantity] = useState(1)

  const addToCart = useCartStore((s) => s.addItem)
  const openCart = useCartStore((s) => s.openCart)
  const { addItem: addWishlist, removeItem: removeWishlist, isInWishlist } = useWishlistStore()

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    fetch('/api/products/' + slug)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((data) => {
        if (cancelled) return
        setProduct(data.product || null)
        setRelated(data.relatedProducts || [])
      })
      .catch(() => { if (!cancelled) setProduct(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [slug])

  useEffect(() => {
    if (product?.sizes) {
      const s = typeof product.sizes === 'string' ? JSON.parse(product.sizes) : product.sizes
      if (s.length > 0) setSelectedSize(s[0])
    }
    if (product?.colors) {
      const c = typeof product.colors === 'string' ? JSON.parse(product.colors) : product.colors
      if (c.length > 0) setSelectedColor(c[0])
    }
  }, [product])

  const isWishlisted = product ? isInWishlist(product.id) : false
  const images = product?.images || []
  const sizes = typeof product?.sizes === 'string' ? JSON.parse(product.sizes || '[]') : (product?.sizes || [])
  const colors = typeof product?.colors === 'string' ? JSON.parse(product.colors || '[]') : (product?.colors || [])

  const handleAddToCart = () => {
    if (!product || !images.length) return
    addToCart({ productId: product.id, name: product.name, price: product.price, image: images[0], quantity, size: selectedSize, color: selectedColor })
    openCart()
  }

  const handleWishlist = () => {
    if (!product || !images.length) return
    if (isWishlisted) removeWishlist(product.id)
    else addWishlist({ productId: product.id, name: product.name, price: product.price, image: images[0], addedAt: new Date().toISOString() })
  }

  if (loading) {
    return (
      <StoreLayout>
        <SkeletonGrid />
      </StoreLayout>
    )
  }

  if (!product) {
    return (
      <StoreLayout>
        <div className="py-32 text-center">
          <h1 className="font-[Playfair_Display] text-3xl text-[#0A0A0A] mb-4">Product Not Found</h1>
          <Link href="/shop" className="font-[Inter] text-sm text-[#C9A96E] uppercase tracking-widest hover:underline">Back to Shop</Link>
        </div>
      </StoreLayout>
    )
  }

  const thumbBorder = (i: number) =>
    'w-20 h-24 overflow-hidden border-2 transition-colors duration-300 cursor-pointer ' +
    (i === selectedImage ? 'border-[#C9A96E]' : 'border-transparent hover:border-gray-300')

  const colorBtn = (c: string) =>
    'px-4 py-2 border font-[Inter] text-xs uppercase tracking-wider transition-colors duration-300 cursor-pointer ' +
    (c === selectedColor ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white' : 'border-gray-200 hover:border-gray-400')

  const sizeBtn = (s: string) =>
    'w-12 h-12 border font-[Inter] text-xs flex items-center justify-center transition-colors duration-300 cursor-pointer ' +
    (s === selectedSize ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white' : 'border-gray-200 hover:border-gray-400')

  const wishBtnCls =
    'w-12 h-12 border flex items-center justify-center transition-colors duration-300 cursor-pointer ' +
    (isWishlisted ? 'border-[#C9A96E] bg-[#C9A96E]/10' : 'border-gray-200 hover:border-gray-400')

  const heartCls = 'w-4 h-4 ' + (isWishlisted ? 'fill-[#C9A96E] text-[#C9A96E]' : '')

  return (
    <StoreLayout>
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto flex items-center gap-2 py-4 font-[Inter] text-xs text-gray-400">
          <Link href="/" className="hover:text-[#0A0A0A] transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/shop" className="hover:text-[#0A0A0A] transition-colors">Shop</Link>
          {product.category && (
            <>
              <ChevronRight className="w-3 h-3" />
              <Link href={'/' + product.category.slug} className="hover:text-[#0A0A0A] transition-colors">{product.category.name}</Link>
            </>
          )}
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#0A0A0A]">{product.name}</span>
        </div>
      </div>

      {/* Product Detail */}
      <div className="px-6 md:px-12 lg:px-24 py-12 md:py-20">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 md:gap-20">
          {/* Images */}
          <div>
            <motion.div key={selectedImage} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="aspect-[3/4] overflow-hidden bg-[#F5F5F5] mb-4">
              <img src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
            </motion.div>
            {images.length > 1 && (
              <div className="flex gap-3">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)} className={thumbBorder(i)}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center">
            {product.brand && (
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#C9A96E] font-[Inter] mb-3">{product.brand.name}</p>
            )}
            <h1 className="font-[Playfair_Display] text-3xl md:text-4xl text-[#0A0A0A] mb-4">{product.name}</h1>
            <div className="flex items-center gap-3 mb-6">
              <span className="font-[Inter] text-2xl">{'\$'}{product.price.toLocaleString()}</span>
              {product.comparePrice && (
                <span className="font-[Inter] text-lg text-gray-400 line-through">{'\$'}{product.comparePrice.toLocaleString()}</span>
              )}
              {product.rating > 0 && (
                <span className="font-[Inter] text-xs text-[#C9A96E]">{product.rating} / 5 ({product.reviewCount})</span>
              )}
            </div>

            <div className="w-full h-px bg-gray-200 my-6" />

            {product.shortDesc && (
              <p className="font-[Inter] text-gray-600 text-sm leading-relaxed mb-8">{product.shortDesc}</p>
            )}

            {/* Color Selector */}
            {colors.length > 0 && (
              <div className="mb-6">
                <p className="font-[Inter] text-xs uppercase tracking-widest text-gray-500 mb-3">Color: {selectedColor}</p>
                <div className="flex gap-3">
                  {colors.map((c) => (
                    <button key={c} onClick={() => setSelectedColor(c)} className={colorBtn(c)}>{c}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selector */}
            {sizes.length > 0 && (
              <div className="mb-8">
                <p className="font-[Inter] text-xs uppercase tracking-widest text-gray-500 mb-3">Size: {selectedSize}</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <button key={s} onClick={() => setSelectedSize(s)} className={sizeBtn(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Actions */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center border border-gray-200">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 h-12 flex items-center justify-center font-[Inter] text-sm">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} className="w-12 h-12 flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button onClick={handleAddToCart} className="flex-1 h-12 bg-[#0A0A0A] text-white font-[Inter] text-xs uppercase tracking-widest hover:bg-[#C9A96E] hover:text-black transition-colors duration-300 flex items-center justify-center gap-2 cursor-pointer">
                <ShoppingBag className="w-4 h-4" /> Add to Bag
              </button>
              <button onClick={handleWishlist} className={wishBtnCls}>
                <Heart className={heartCls} />
              </button>
            </div>

            {product.material && (
              <p className="font-[Inter] text-xs text-gray-500 mb-1">
                <span className="uppercase tracking-wider">Material:</span> {product.material}
              </p>
            )}
            {product.care && (
              <p className="font-[Inter] text-xs text-gray-500">
                <span className="uppercase tracking-wider">Care:</span> {product.care}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <div className="px-6 md:px-12 lg:px-24 pb-16">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-[Playfair_Display] text-2xl text-[#0A0A0A] mb-4">Description</h2>
            <div className="w-12 h-px bg-[#C9A96E] mb-6" />
            <p className="font-[Inter] text-gray-600 text-sm leading-relaxed max-w-3xl">{product.description}</p>
          </div>
        </div>
      )}

      {/* Related Products */}
      {related.length > 0 && (
        <div className="bg-[#0A0A0A]">
          <div className="px-6 md:px-12 lg:px-24 py-16 md:py-24">
            <h2 className="font-[Playfair_Display] text-3xl md:text-4xl text-white text-center mb-4">You May Also Like</h2>
            <div className="w-12 h-px bg-[#C9A96E] mx-auto mb-12" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-7xl mx-auto">
              {related.slice(0, 4).map((p) => (
                <Link key={p.id} href={'/product/' + p.slug} className="group">
                  <div className="aspect-[3/4] overflow-hidden bg-white/5 mb-4">
                    {p.images?.[0] && <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-[#C9A96E]/70 font-[Inter]">{p.brand?.name}</p>
                  <h3 className="font-[Playfair_Display] text-white/90 text-sm group-hover:text-[#C9A96E] transition-colors">{p.name}</h3>
                  <p className="font-[Inter] text-white/60 text-sm mt-1">{'\$'}{p.price.toLocaleString()}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </StoreLayout>
  )
}