'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function EditorialSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: 'easeOut' },
    },
  };

  return (
    <section
      ref={sectionRef}
      className="py-32 px-6 md:px-12 lg:px-24 bg-[#FAFAFA]"
    >
      {/* Header */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8 }}
        className="font-['Playfair_Display'] text-4xl md:text-5xl text-center mb-16 text-[#0A0A0A]"
      >
        The Edit
      </motion.h2>

      {/* Magazine grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto"
      >
        {/* Large left column */}
        <motion.div variants={itemVariants} className="lg:col-span-7 relative group">
          <div className="relative overflow-hidden">
            <div
              className="aspect-[2/3] bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{
                backgroundImage:
                  'url(https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&h=1200&fit=crop)',
              }}
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            {/* Editorial text */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
              <h3 className="font-['Playfair_Display'] text-3xl md:text-4xl text-white mb-3">
                The New Guard
              </h3>
              <p className="text-white/70 font-['Inter'] text-sm leading-relaxed mb-4 max-w-md">
                How a generation of designers is redefining luxury for the modern era
              </p>
              <a
                href="#"
                className="inline-flex items-center gap-2 text-[#C9A96E] font-['Inter'] text-xs uppercase tracking-widest hover:gap-3 transition-all duration-300"
              >
                Read the Story
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </motion.div>

        {/* Right column: stacked cards */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Card 1 */}
          <motion.div variants={itemVariants} className="relative group">
            <div className="relative overflow-hidden">
              <div
                className="aspect-[3/2] bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{
                  backgroundImage:
                    'url(https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop)',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="font-['Playfair_Display'] text-2xl text-white mb-2">
                  Artisanal Craft
                </h3>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 text-[#C9A96E] font-['Inter'] text-xs uppercase tracking-widest hover:gap-3 transition-all duration-300"
                >
                  Explore
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div variants={itemVariants} className="relative group">
            <div className="relative overflow-hidden">
              <div
                className="aspect-[3/2] bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{
                  backgroundImage:
                    'url(https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=600&h=400&fit=crop)',
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="font-['Playfair_Display'] text-2xl text-white mb-2">
                  Sustainable Luxury
                </h3>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 text-[#C9A96E] font-['Inter'] text-xs uppercase tracking-widest hover:gap-3 transition-all duration-300"
                >
                  Explore
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
