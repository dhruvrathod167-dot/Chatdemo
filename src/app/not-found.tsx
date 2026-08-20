'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Subtle cross pattern */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Gold accent line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-16 h-px bg-[#C9A96E] mb-8"
      />

      {/* MAISON branding */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6"
      >
        <Link href="/" className="font-['Playfair_Display'] text-3xl tracking-widest text-[#C9A96E] hover:tracking-[0.3em] transition-all duration-500">
          MAISON
        </Link>
      </motion.div>

      {/* 404 Number */}
      <motion.h1
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="font-['Playfair_Display'] text-[120px] md:text-[200px] leading-none text-white/[0.06] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
      >
        404
      </motion.h1>

      {/* Error text */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center max-w-lg"
      >
        <h2 className="font-['Playfair_Display'] text-2xl md:text-3xl text-white mb-4">
          Page Not Found
        </h2>
        <p className="font-['Inter'] text-white/50 text-sm md:text-base leading-relaxed mb-10">
          The page you are looking for may have been moved, renamed, or is
          temporarily unavailable. Let us guide you back to our collections.
        </p>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col sm:flex-row items-center gap-4"
      >
        <Link
          href="/"
          className="font-['Inter'] text-sm uppercase tracking-widest px-8 py-4 bg-[#C9A96E] text-[#0A0A0A] hover:bg-[#d4b87e] transition-colors duration-300"
        >
          Back to Home
        </Link>
        <Link
          href="/shop"
          className="font-['Inter'] text-sm uppercase tracking-widest px-8 py-4 border border-white/20 text-white hover:bg-white/10 transition-colors duration-300"
        >
          Browse Collections
        </Link>
      </motion.div>

      {/* Gold accent line bottom */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="w-16 h-px bg-[#C9A96E] mt-12"
      />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.1 }}
        className="font-['Inter'] text-white/30 text-[10px] tracking-widest uppercase mt-8"
      >
        Luxury Fashion and Lifestyle
      </motion.p>
    </div>
  );
}
