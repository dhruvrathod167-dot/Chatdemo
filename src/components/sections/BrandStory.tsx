'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function BrandStory() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section
      ref={sectionRef}
      className="py-32 px-6 md:px-12 lg:px-24 bg-[#0A0A0A]"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
        {/* Left: Image */}
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -60 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="relative"
        >
          <div
            className="aspect-[4/5] bg-cover bg-center"
            style={{
              backgroundImage:
                'url(https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=1000&fit=crop)',
            }}
          />
          {/* Gold border accent */}
          <div className="absolute inset-0 border border-[#C9A96E]/30 pointer-events-none" />
        </motion.div>

        {/* Right: Text */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 60 }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
        >
          <p className="uppercase tracking-[0.3em] text-[#C9A96E] text-xs mb-4">
            Our Story
          </p>
          <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl text-white mb-6 leading-tight">
            Crafting Timeless Elegance Since 1947
          </h2>
          <div className="space-y-5">
            <p className="text-white/60 leading-relaxed font-['Inter']">
              Born in the ateliers of post-war Paris, our maison was founded on a
              singular belief: that true luxury is not merely acquired, but felt.
              Every garment we create carries the weight of decades of artisanal
              knowledge, passed down through generations of master craftsmen who
              understand that excellence is found in the unseen details.
            </p>
            <p className="text-white/60 leading-relaxed font-['Inter']">
              Our ateliers remain nestled in the same arrondissement where the
              founder first sketched his vision onto parchment. Here, the
              slow, deliberate art of hand-finishing endures — each seam is
              considered, each button sourced from the finest horn and mother-of-pearl,
              each silhouette refined through hundreds of hours of patient draping.
            </p>
            <p className="text-white/60 leading-relaxed font-['Inter']">
              We do not follow seasons. We follow conviction. In an age of fleeting
              trends, we remain steadfast in our commitment to creating pieces that
              transcend the calendar — garments that will be cherished today and
              inherited tomorrow.
            </p>
          </div>
          <a
            href="#"
            className="inline-flex items-center gap-2 mt-8 text-[#C9A96E] font-['Inter'] text-sm tracking-wide hover:gap-3 transition-all duration-300"
          >
            Read More
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
