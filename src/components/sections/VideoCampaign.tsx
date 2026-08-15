'use client';

import { useRef, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { Play } from 'lucide-react';
import { toast } from 'sonner';

export default function VideoCampaign() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  const handlePlayClick = useCallback(() => {
    toast('Video would play here', {
      description: 'The Autumn/Winter 2026 campaign film is coming soon.',
    });
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-[70vh] overflow-hidden"
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1920&h=1080&fit=crop)',
        }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6"
      >
        {/* Play button */}
        <motion.button
          onClick={handlePlayClick}
          initial={{ scale: 1 }}
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
          whileTap={{ scale: 0.95 }}
          className="w-20 h-20 rounded-full border-2 border-white flex items-center justify-center cursor-pointer transition-colors duration-300 mb-6"
          aria-label="Play campaign video"
        >
          <Play className="w-8 h-8 text-white ml-1" fill="white" />
        </motion.button>

        {/* Campaign label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="uppercase tracking-[0.3em] text-white/80 text-xs mb-4"
        >
          Autumn/Winter 2026 Campaign
        </motion.p>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="font-['Playfair_Display'] text-4xl md:text-6xl text-white"
        >
          A Study in Contrasts
        </motion.h2>
      </motion.div>
    </section>
  );
}
