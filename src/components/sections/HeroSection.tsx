'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Play, ChevronDown } from 'lucide-react'

gsap.registerPlugin(useGSAP)

const HERO_IMAGE_1 = 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1920&h=1080&fit=crop'
const HERO_IMAGE_2 = 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1920&h=1080&fit=crop'

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const headlineRef = useRef<HTMLDivElement>(null)
  const taglineRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)
  const image1Ref = useRef<HTMLDivElement>(null)
  const image2Ref = useRef<HTMLDivElement>(null)

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const sectionRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  })

  const bgScale1 = useTransform(scrollYProgress, [0, 1], [1, 1.15])
  const bgScale2 = useTransform(scrollYProgress, [0, 1], [1.15, 1])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0])
  const contentY = useTransform(scrollYProgress, [0, 0.45], [0, -60])
  const slide2Opacity = useTransform(scrollYProgress, [0.4, 0.6, 0.85], [0, 1, 1])
  const slide2Y = useTransform(scrollYProgress, [0.4, 0.6], [40, 0])
  const scrollIndicatorOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    setMousePos({ x, y })
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('mousemove', handleMouseMove)
    return () => container.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove])

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.fromTo(
        '.hero-word',
        { y: 100, opacity: 0, rotateX: 40 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          stagger: 0.12,
          duration: 1.2,
        }
      )
        .fromTo(
          taglineRef.current,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 1 },
          '-=0.6'
        )
        .fromTo(
          ctaRef.current,
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8 },
          '-=0.5'
        )
        .fromTo(
          scrollIndicatorRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8 },
          '-=0.3'
        )

      // Scroll indicator pulse
      gsap.to('.scroll-line', {
        y: 12,
        opacity: 0,
        duration: 1.5,
        repeat: -1,
        ease: 'power2.inOut',
        yoyo: true,
      })
    },
    { scope: containerRef }
  )

  const headlineStyle = {
    transform: `translate3d(${mousePos.x * 15}px, ${mousePos.y * 10}px, 0)`,
  }

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: '200vh' }}
      aria-label="Hero"
    >
      <div
        ref={containerRef}
        className="relative h-screen overflow-hidden"
      >
        {/* Background Image 1 */}
        <div
          ref={image1Ref}
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${HERO_IMAGE_1})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              scale: bgScale1,
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0.5) 100%)',
            }}
          />
        </div>

        {/* Background Image 2 (Second Slide) */}
        <div
          ref={image2Ref}
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${HERO_IMAGE_2})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              scale: bgScale2,
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.6) 100%)',
            }}
          />
        </div>

        {/* Slide 1 Content */}
        <motion.div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center"
          style={{ opacity: contentOpacity, y: contentY }}
        >
          {/* Season Tag */}
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-['Inter'] uppercase tracking-[0.3em] text-xs text-[#C9A96E] mb-8"
          >
            Autumn / Winter 2026
          </motion.p>

          {/* Headline with mouse follow */}
          <div ref={headlineRef} style={headlineStyle}>
            <h1 className="font-['Playfair_Display'] text-white font-light leading-[0.9] text-center">
              <span className="hero-word inline-block text-7xl md:text-8xl lg:text-9xl">
                THE ART OF
              </span>
              <br />
              <span className="hero-word inline-block text-7xl md:text-8xl lg:text-9xl">
                MODERN LUXURY
              </span>
            </h1>
          </div>

          {/* Tagline */}
          <p
            ref={taglineRef}
            className="font-['Inter'] text-white/70 text-lg mt-8 text-center max-w-lg px-6"
          >
            Discover the new collection that redefines contemporary elegance
          </p>

          {/* CTA Buttons */}
          <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4 mt-12">
            <button className="bg-white text-black uppercase tracking-widest text-sm px-8 py-4 hover:bg-[#C9A96E] transition-all duration-500 cursor-pointer font-['Inter'] font-medium">
              Explore Collection
            </button>
            <button className="border border-white/30 text-white uppercase tracking-widest text-sm px-8 py-4 hover:border-white hover:bg-white/10 transition-all duration-500 cursor-pointer font-['Inter'] font-medium flex items-center gap-3">
              <Play className="w-4 h-4 fill-current" />
              Watch Campaign
            </button>
          </div>
        </motion.div>

        {/* Slide 2 Content */}
        <motion.div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center"
          style={{ opacity: slide2Opacity, y: slide2Y }}
        >
          <p className="font-['Inter'] uppercase tracking-[0.3em] text-xs text-[#D4AF37] mb-8">
            Exclusive Preview
          </p>
          <h2 className="font-['Playfair_Display'] text-white font-light leading-[0.9] text-center">
            <span className="inline-block text-5xl md:text-7xl lg:text-8xl">
              TIMELESS
            </span>
            <br />
            <span className="inline-block text-5xl md:text-7xl lg:text-8xl italic">
              Silhouettes
            </span>
          </h2>
          <p className="font-['Inter'] text-white/60 text-lg mt-8 text-center max-w-md px-6">
            Where heritage craftsmanship meets avant-garde design
          </p>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          ref={scrollIndicatorRef}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-3"
          style={{ opacity: scrollIndicatorOpacity }}
        >
          <span className="font-['Inter'] text-white/50 text-[10px] uppercase tracking-[0.25em]">
            Scroll to explore
          </span>
          <div className="scroll-line w-px h-8 bg-white/30" />
          <ChevronDown className="w-4 h-4 text-white/40" />
        </motion.div>
      </div>
    </section>
  )
}
