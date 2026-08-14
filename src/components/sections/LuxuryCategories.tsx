'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface Category {
  name: string
  image: string
  size: 'large' | 'small'
}

const topRow: Category[] = [
  {
    name: 'Women',
    image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&h=1000&fit=crop',
    size: 'large',
  },
  {
    name: 'Men',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=1000&fit=crop',
    size: 'large',
  },
]

const bottomRow: Category[] = [
  {
    name: 'Accessories',
    image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&h=800&fit=crop',
    size: 'small',
  },
  {
    name: 'Shoes',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&h=800&fit=crop',
    size: 'small',
  },
  {
    name: 'Bags',
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=800&fit=crop',
    size: 'small',
  },
]

const largeCardVariants = {
  hidden: { y: 100, opacity: 0, scale: 0.95 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      delay: 0.1 + i * 0.2,
      duration: 1,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

const smallCardVariants = {
  hidden: { y: 80, opacity: 0, scale: 0.95 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      delay: 0.4 + i * 0.15,
      duration: 0.9,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

export default function LuxuryCategories() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-80px' })

  return (
    <section
      ref={sectionRef}
      className="bg-[#FAFAFA] py-32 px-6 md:px-12 lg:px-24"
      aria-label="Shop by Category"
    >
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-center mb-16"
      >
        <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl text-[#0A0A0A]">
          Shop by Category
        </h2>
      </motion.div>

      {/* Top Row — 2 Large Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {topRow.map((category, index) => (
          <motion.article
            key={category.name}
            custom={index}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={largeCardVariants}
            className="group relative overflow-hidden cursor-pointer h-[50vh] md:h-[50vh]"
          >
            {/* Background */}
            <div
              className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              style={{
                backgroundImage: `url(${category.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/30 transition-all duration-500 group-hover:bg-black/40" />

            {/* Category Name */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <h3 className="font-['Playfair_Display'] text-3xl md:text-4xl lg:text-5xl text-white uppercase tracking-widest transition-transform duration-500 group-hover:-translate-y-1">
                  {category.name}
                </h3>
                <div className="mt-4 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="font-['Inter'] text-[11px] uppercase tracking-[0.25em] text-white/80 border-b border-white/40 pb-1">
                    Shop Now
                  </span>
                </div>
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      {/* Bottom Row — 3 Small Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {bottomRow.map((category, index) => (
          <motion.article
            key={category.name}
            custom={index}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={smallCardVariants}
            className="group relative overflow-hidden cursor-pointer h-[50vh] md:h-[40vh]"
          >
            {/* Background */}
            <div
              className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              style={{
                backgroundImage: `url(${category.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/30 transition-all duration-500 group-hover:bg-black/40" />

            {/* Category Name */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <h3 className="font-['Playfair_Display'] text-2xl md:text-3xl lg:text-4xl text-white uppercase tracking-widest transition-transform duration-500 group-hover:-translate-y-1">
                  {category.name}
                </h3>
                <div className="mt-3 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="font-['Inter'] text-[11px] uppercase tracking-[0.25em] text-white/80 border-b border-white/40 pb-1">
                    Shop Now
                  </span>
                </div>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  )
}
