'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { useUIStore } from '@/stores/ui-store';
import { useHydrated } from '@/hooks/use-hydrated';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Heart,
  ShoppingBag,
  User,
  Menu,
  X,
} from 'lucide-react';

const NAV_LINKS = [
  { label: 'Women', href: '/women' },
  { label: 'Men', href: '/men' },
  { label: 'Accessories', href: '/accessories' },
  { label: 'Shoes', href: '/shoes' },
  { label: 'Bags', href: '/bags' },
  { label: 'Jewelry', href: '/jewelry' },
];

const mobileMenuVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
};

const mobileLinkVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.15 + i * 0.06,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
  exit: { opacity: 0, y: 15, transition: { duration: 0.2 } },
};

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  const hydrated = useHydrated();

  const cartItemCount = useCartStore((s) => s.getItemCount());
  const wishlistCount = useWishlistStore((s) => s.getCount());
  const cartToggle = useCartStore((s) => s.toggleCart);
  const searchOpen = useUIStore((s) => s.searchOpen);
  const openSearch = useUIStore((s) => s.openSearch);
  const mobileMenuOpen = useUIStore((s) => s.mobileMenuOpen);
  const openMobileMenu = useUIStore((s) => s.openMobileMenu);
  const closeMobileMenu = useUIStore((s) => s.closeMobileMenu);

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 40);
  });

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleNavClick = useCallback(() => {
    closeMobileMenu();
  }, [closeMobileMenu]);

  return (
    <>
      <motion.header
        className={
          'fixed top-0 left-0 right-0 z-50 transition-colors duration-500 h-20 md:h-16'
        }
        initial={false}
        animate={{
          backgroundColor: scrolled
            ? 'rgba(10, 10, 10, 0.8)'
            : 'rgba(10, 10, 10, 0)',
          backdropFilter: scrolled ? 'blur(24px)' : 'blur(0px)',
        }}
        style={{
          WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'blur(0px)',
        }}
      >
        {/* Border bottom on scroll */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px bg-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: scrolled ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        />

        <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-5 md:px-8">
          {/* Left: Hamburger (mobile) + Nav Links (desktop) */}
          <div className="flex items-center gap-6">
            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-white/90 hover:text-white hover:bg-white/10"
              onClick={openMobileMenu}
              aria-label="Open menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {/* Desktop nav links */}
            <ul className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <NavLink label={link.label} href={link.href} />
                </li>
              ))}
            </ul>
          </div>

          {/* Center: Logo */}
          <a
            href="/"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none"
          >
            <span className="font-['Playfair_Display'] text-2xl md:text-3xl font-semibold tracking-wide text-[#C9A96E]">
              MAISON
            </span>
          </a>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/90 hover:text-white hover:bg-white/10"
              onClick={openSearch}
              aria-label="Search"
            >
              <Search className="h-[20px] w-[20px]" />
            </Button>

            {/* Wishlist */}
            <Button
              variant="ghost"
              size="icon"
              className="relative text-white/90 hover:text-white hover:bg-white/10"
              aria-label="Wishlist"
            >
              <Heart className="h-[20px] w-[20px]" />
              <AnimatePresence>
                {hydrated && wishlistCount > 0 && (
                  <motion.span
                    key="wishlist-badge"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#C9A96E] text-[10px] font-semibold text-black"
                  >
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>

            {/* Cart */}
            <Button
              variant="ghost"
              size="icon"
              className="relative text-white/90 hover:text-white hover:bg-white/10"
              onClick={cartToggle}
              aria-label="Shopping bag"
            >
              <ShoppingBag className="h-[20px] w-[20px]" />
              <AnimatePresence>
                {hydrated && cartItemCount > 0 && (
                  <motion.span
                    key="cart-badge"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#C9A96E] text-[10px] font-semibold text-black"
                  >
                    {cartItemCount > 9 ? '9+' : cartItemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>

            {/* User */}
            <Button
              variant="ghost"
              size="icon"
              className="text-white/90 hover:text-white hover:bg-white/10"
              aria-label="Account"
            >
              <User className="h-[20px] w-[20px]" />
            </Button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            variants={mobileMenuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[60] bg-[#0A0A0A] flex flex-col items-center justify-center"
          >
            <button
              onClick={closeMobileMenu}
              className="absolute top-5 right-5 text-white/80 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>

            <ul className="flex flex-col items-center gap-6">
              {NAV_LINKS.map((link, i) => (
                <motion.li
                  key={link.label}
                  custom={i}
                  variants={mobileLinkVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <a
                    href={link.href}
                    onClick={handleNavClick}
                    className="font-['Playfair_Display'] text-4xl font-light text-white/90 hover:text-[#C9A96E] transition-colors duration-300"
                  >
                    {link.label}
                  </a>
                </motion.li>
              ))}
            </ul>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="absolute bottom-12 flex items-center gap-6 text-white/50 text-xs font-['Inter'] tracking-widest uppercase"
            >
              <a href="#" className="hover:text-[#C9A96E] transition-colors">Account</a>
              <span>·</span>
              <a href="#" className="hover:text-[#C9A96E] transition-colors">Wishlist</a>
              <span>·</span>
              <a href="#" className="hover:text-[#C9A96E] transition-colors">Contact</a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Desktop nav link with gold underline hover animation               */
/* ------------------------------------------------------------------ */
function NavLink({ label, href }: { label: string; href: string }) {
  return (
    <a href={href} className="group relative px-3 py-2">
      <span className="font-['Inter'] text-[13px] tracking-[0.08em] uppercase text-white/80 group-hover:text-white transition-colors duration-300">
        {label}
      </span>
      <motion.span
        className="absolute bottom-1 left-3 right-3 h-px bg-[#C9A96E] origin-left"
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      />
    </a>
  );
}
