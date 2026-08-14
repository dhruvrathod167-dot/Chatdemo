'use client';

import { useRef, useState, FormEvent } from 'react';
import { motion, useInView } from 'framer-motion';

export default function NewsletterSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <section
      ref={sectionRef}
      className="py-32 px-6 bg-[#FAFAFA]"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="max-w-xl mx-auto text-center"
      >
        <p className="uppercase tracking-[0.3em] text-[#C9A96E] text-xs mb-4 font-['Inter']">
          Stay Informed
        </p>
        <h2 className="font-['Playfair_Display'] text-4xl md:text-5xl text-[#0A0A0A] mb-6">
          Join the Maison Circle
        </h2>
        <p className="text-gray-500 font-['Inter'] text-center max-w-md mx-auto mb-10 leading-relaxed">
          Be the first to discover new collections, exclusive events, and curated
          style insights. Members enjoy early access and private sale invitations.
        </p>

        {status === 'success' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-4"
          >
            <p className="font-['Playfair_Display'] text-2xl text-[#0A0A0A] mb-2">
              Welcome to the Circle
            </p>
            <p className="text-gray-500 font-['Inter'] text-sm">
              You will receive our next correspondence shortly.
            </p>
          </motion.div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === 'error') setStatus('idle');
              }}
              placeholder="Enter your email address"
              className="w-full bg-white border border-gray-200 px-6 py-4 text-sm font-['Inter'] text-[#0A0A0A] placeholder:text-gray-400 focus:outline-none focus:border-[#C9A96E] transition-colors duration-300"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full sm:w-auto bg-[#0A0A0A] text-white px-8 py-4 uppercase tracking-widest text-xs font-['Inter'] hover:bg-[#C9A96E] hover:text-black transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p className="text-red-500 text-xs mt-3 font-['Inter']">
            Something went wrong. Please try again.
          </p>
        )}

        <p className="text-xs text-gray-400 mt-6 font-['Inter']">
          By subscribing, you agree to our Privacy Policy
        </p>
      </motion.div>
    </section>
  );
}
