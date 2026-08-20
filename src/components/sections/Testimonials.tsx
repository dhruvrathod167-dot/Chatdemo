'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  motion,
  AnimatePresence,
  useInView,
} from 'framer-motion';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  title: string;
  text: string;
  rating: number;
}

const fallbackTestimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Isabelle Fontaine',
    title: 'Paris, France',
    text: 'The attention to detail is simply extraordinary. Each piece feels as though it was conceived specifically for me — a rarity in today\'s world of mass luxury.',
    rating: 5,
  },
  {
    id: 2,
    name: 'Alexander Worthington',
    title: 'London, United Kingdom',
    text: 'I have patronised the finest houses in Europe, yet nothing compares to the singular vision and impeccable craftsmanship found here. Truly the pinnacle of modern elegance.',
    rating: 5,
  },
  {
    id: 3,
    name: 'Carolina Reyes',
    title: 'New York, United States',
    text: 'From the moment I stepped into their atelier, I understood that this was not merely fashion — it was art. The garments possess a soul that is unmistakable.',
    rating: 5,
  },
  {
    id: 4,
    name: 'Haruki Tanaka',
    title: 'Tokyo, Japan',
    text: 'The fusion of timeless design with contemporary sensibility is remarkable. Every collection tells a story that resonates far beyond the runway.',
    rating: 5,
  },
];

export default function Testimonials() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });
  const [testimonials, setTestimonials] = useState<Testimonial[]>(fallbackTestimonials);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Fetch testimonials from API
  useEffect(() => {
    fetch('/api/testimonials')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTestimonials(data);
        }
      })
      .catch(() => {
        // Use fallback data silently
      });
  }, []);

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > currentIndex ? 1 : -1);
      setCurrentIndex(index);
    },
    [currentIndex],
  );

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  }, [testimonials.length]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length,
    );
  }, [testimonials.length]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    const interval = setInterval(goNext, 5000);
    return () => clearInterval(interval);
  }, [goNext]);

  const current = testimonials[currentIndex];

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
      transition: { duration: 0.4, ease: 'easeIn' },
    }),
  };

  return (
    <section
      ref={sectionRef}
      className="py-32 px-6 md:px-12 lg:px-24 bg-white"
    >
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8 }}
        className="font-['Playfair_Display'] text-4xl text-center mb-20 text-[#0A0A0A]"
      >
        What Our Clients Say
      </motion.h2>

      <div className="relative max-w-4xl mx-auto">
        {/* Decorative quote mark */}
        <div className="text-[120px] leading-none font-['Playfair_Display'] text-[#C9A96E]/20 absolute -top-10 left-1/2 -translate-x-1/2 select-none pointer-events-none">
          &ldquo;
        </div>

        {/* Testimonial content */}
        <div className="relative min-h-[240px] flex flex-col items-center justify-center">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col items-center text-center px-4"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < current.rating
                        ? 'text-[#C9A96E] fill-[#C9A96E]'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>

              {/* Quote text */}
              <p className="font-['Playfair_Display'] italic text-2xl md:text-3xl leading-relaxed text-[#0A0A0A] max-w-3xl mb-8">
                {current.text}
              </p>

              {/* Name and title */}
              <p className="font-['Inter'] text-sm font-medium text-[#0A0A0A] mb-1">
                {current.name}
              </p>
              <p className="font-['Inter'] uppercase tracking-widest text-xs text-gray-500">
                {current.title}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation arrows */}
        <div className="flex items-center justify-center gap-6 mt-10">
          <button
            onClick={goPrev}
            className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:border-[#C9A96E] hover:text-[#C9A96E] transition-colors duration-300 cursor-pointer"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Dot indicators */}
          <div className="flex gap-2">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentIndex
                    ? 'bg-[#C9A96E] w-6'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to testimonial ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={goNext}
            className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:border-[#C9A96E] hover:text-[#C9A96E] transition-colors duration-300 cursor-pointer"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
