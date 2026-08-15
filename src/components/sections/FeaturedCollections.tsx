'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

interface Collection {
  title: string
  subtitle: string
  image: string
}

const collections: Collection[] = [
  {
    title: 'Noir Minimalism',
    subtitle: 'The power of restraint',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&h=800&fit=crop',
  },
  {
    title: 'Golden Hour',
    subtitle: 'Warmth in every thread',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop',
  },
  {
    title: 'Eternal Elegance',
    subtitle: 'Beyond seasonal trends',
    image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&h=800&fit=crop',
  },
]

const cardVariants = {
  hidden: {
    y: 80,
    opacity: 0,
  },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: {
      delay: 0.1 + i * 0.15,
      duration: 0.8,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

export default function FeaturedCollections() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section
      ref={sectionRef}
      className="bg-white py-32 px-6 md:px-12 lg:px-24"
      aria-label="Featured Collections"
    >
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-center mb-16"
      >
        <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl text-[#0A0A0A] mb-6">
          Featured Collections
        </h2>
        <div className="flex justify-center">
          <div className="w-12 h-px bg-[#C9A96E]" />
        </div>
      </motion.div>

      {/* Collection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {collections.map((collection, index) => (
          <motion.article
            key={collection.title}
            custom={index}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={cardVariants}
            className="group relative aspect-[3/4] overflow-hidden cursor-pointer"
          >
            {/* Image */}
            <div
              className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
              style={{
                backgroundImage: `url(${collection.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent transition-all duration-500 group-hover:from-black/80" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-8 transition-transform duration-500 group-hover:-translate-y-2">
              <p className="font-['Inter'] text-[10px] uppercase tracking-[0.3em] text-[#C9A96E] mb-2">
                {collection.subtitle}
              </p>
              <h3 className="font-['Playfair_Display'] text-2xl md:text-3xl text-white mb-4">
                {collection.title}
              </h3>
              <div className="flex items-center gap-2 text-white/70 group-hover:text-[#C9A96E] transition-colors duration-300">
                <span className="font-['Inter'] text-xs uppercase tracking-widest">
                  Explore
                </span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      {/* View All Link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.8 }}
        className="text-center mt-16"
      >
        <button className="inline-flex items-center gap-3 font-['Inter'] text-sm uppercase tracking-widest text-[#0A0A0A] hover:text-[#C9A96E] transition-colors duration-300 cursor-pointer group">
          View All Collections
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </motion.div>
    </section>
  )
}
