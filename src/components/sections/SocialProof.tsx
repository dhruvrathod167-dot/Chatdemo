'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface StatItem {
  value: number;
  suffix: string;
  label: string;
}

const stats: StatItem[] = [
  { value: 200, suffix: '+', label: 'Designer Brands' },
  { value: 50, suffix: 'K+', label: 'Happy Clients' },
  { value: 120, suffix: '+', label: 'Countries' },
  { value: 15, suffix: '+', label: 'Years of Excellence' },
];

function CountingNumber({
  value,
  suffix,
  shouldStart,
}: {
  value: number;
  suffix: string;
  shouldStart: boolean;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!shouldStart) return;

    let start = 0;
    const duration = 2000; // 2 seconds
    const increment = value / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [shouldStart, value]);

  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

export default function SocialProof() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-50px' });

  return (
    <section ref={sectionRef} className="py-20 px-6 bg-[#0A0A0A]">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={
              isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
            }
            transition={{ duration: 0.6, delay: index * 0.15 }}
            className="text-center"
          >
            <div className="font-['Playfair_Display'] text-5xl md:text-6xl text-white">
              <CountingNumber
                value={stat.value}
                suffix={stat.suffix}
                shouldStart={isInView}
              />
            </div>
            <p className="uppercase tracking-widest text-xs text-[#C9A96E] mt-2 font-['Inter']">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Gold divider lines between stats on desktop */}
      <div className="hidden md:block max-w-6xl mx-auto mt-8">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#C9A96E]/20 to-transparent" />
      </div>
    </section>
  );
}
