'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MouseFollower() {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Only show on desktop with pointer
    const mq = window.matchMedia('(pointer: fine)');
    if (!mq.matches) return;

    setVisible(true);

    const handleMove = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setPos({ x: e.clientX, y: e.clientY });
      });
    };

    const handleEnter = () => setHovering(true);
    const handleLeave = () => setHovering(false);

    // Track hoverable elements
    const addListeners = () => {
      document.addEventListener('mousemove', handleMove);
      const interactiveElements = document.querySelectorAll('a, button, [role="button"], input, select, .group');
      interactiveElements.forEach((el) => {
        el.addEventListener('mouseenter', handleEnter);
        el.addEventListener('mouseleave', handleLeave);
      });
    };

    // Initial + re-observe for dynamic content
    addListeners();
    const observer = new MutationObserver(addListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('mousemove', handleMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 z-[9999] pointer-events-none mix-blend-difference"
        animate={{
          x: pos.x - 6,
          y: pos.y - 6,
        }}
        transition={{ type: 'spring', damping: 30, stiffness: 500, mass: 0.5 }}
      >
        <motion.div
          className="rounded-full bg-white"
          animate={{
            width: hovering ? 48 : 12,
            height: hovering ? 48 : 12,
            x: hovering ? -24 : -6,
            y: hovering ? -24 : -6,
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 400 }}
        />
      </motion.div>
    </>
  );
}
