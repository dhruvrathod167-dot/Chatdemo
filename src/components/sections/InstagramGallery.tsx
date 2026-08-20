'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Instagram } from 'lucide-react';

const images = [
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop',
];

export default function InstagramGallery() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-32 px-6 md:px-12 lg:px-24 bg-white">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <Instagram className="w-5 h-5 text-[#C9A96E]" />
          <span className="text-xs uppercase tracking-[0.3em] text-[#C9A96E]">Follow Us</span>
        </div>
        <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl mb-4">@maison.official</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Join our community of style connoisseurs. Share your Maison moments.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1">
        {images.map((src, i) => (
          <motion.a
            key={i}
            href="#"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="group relative aspect-square overflow-hidden"
          >
            <img
              src={src}
              alt={`Instagram post ${i + 1}`}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-500 flex items-center justify-center">
              <Instagram className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
