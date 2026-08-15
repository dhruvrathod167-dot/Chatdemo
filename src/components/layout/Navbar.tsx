'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { useUIStore } from '@/stores/ui-store';
import { useHydrated } from '@/hooks/use-hydrated';
import {
  Search,
  Heart,
  ShoppingBag,
  User,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';

/* ================================================================ */
/*  Types                                                            */
/* ================================================================ */

interface Subcategory {
  label: string;
  href: string;
}

interface NavCategory {
  label: string;
  href: string;
  hasMegaMenu: boolean;
  columns?: { heading: string; links: Subcategory[] }[];
  featured?: { image: string; alt: string; cta: string; ctaHref: string };
  subcategories?: Subcategory[];
}

/* ================================================================ */
/*  Data                                                             */
/* ================================================================ */

const ANNOUNCEMENTS = [
  'Complimentary shipping on orders over $500',
  'New Season: Spring/Summer 2026 Collection',
  'Exclusive: Book a private styling appointment',
  'Complimentary gift wrapping on all orders',
];

const NAV_LINKS: NavCategory[] = [
  {
    label: 'New Arrivals',
    href: '/shop?sort=newest',
    hasMegaMenu: false,
  },
  {
    label: 'Women',
    href: '/category/women',
    hasMegaMenu: true,
    columns: [
      {
        heading: 'Clothing',
        links: [
          { label: 'Dresses', href: '/category/women/dresses' },
          { label: 'Gowns', href: '/category/women/gowns' },
          { label: 'Tops', href: '/category/women/tops' },
          { label: 'Knitwear', href: '/category/women/knitwear' },
          { label: 'Coats & Jackets', href: '/category/women/coats-jackets' },
          { label: 'Skirts', href: '/category/women/skirts' },
          { label: 'Pants', href: '/category/women/pants' },
        ],
      },
      {
        heading: 'Accessories',
        links: [
          { label: 'Bags', href: '/category/women/bags' },
          { label: 'Shoes', href: '/category/women/shoes' },
          { label: 'Jewelry', href: '/category/women/jewelry' },
          { label: 'Scarves', href: '/category/women/scarves' },
          { label: 'Belts', href: '/category/women/belts' },
          { label: 'Sunglasses', href: '/category/women/sunglasses' },
        ],
      },
    ],
    featured: {
      image: '',
      alt: 'Women Spring/Summer 2026 Editorial',
      cta: 'Shop the Edit',
      ctaHref: '/category/women?sort=newest',
    },
  },
  {
    label: 'Men',
    href: '/category/men',
    hasMegaMenu: true,
    columns: [
      {
        heading: 'Clothing',
        links: [
          { label: 'Suits & Blazers', href: '/category/men/suits-blazers' },
          { label: 'Shirts', href: '/category/men/shirts' },
          { label: 'Trousers', href: '/category/men/trousers' },
          { label: 'Knitwear', href: '/category/men/knitwear' },
          { label: 'Outerwear', href: '/category/men/outerwear' },
          { label: 'T-Shirts', href: '/category/men/t-shirts' },
        ],
      },
      {
        heading: 'Accessories',
        links: [
          { label: 'Bags', href: '/category/men/bags' },
          { label: 'Shoes', href: '/category/men/shoes' },
          { label: 'Watches', href: '/category/men/watches' },
          { label: 'Belts', href: '/category/men/belts' },
          { label: 'Ties', href: '/category/men/ties' },
          { label: 'Cufflinks', href: '/category/men/cufflinks' },
        ],
      },
    ],
    featured: {
      image: '',
      alt: 'Men New Season Editorial',
      cta: 'New Season',
      ctaHref: '/category/men?sort=newest',
    },
  },
  {
    label: 'Bags',
    href: '/category/bags',
    hasMegaMenu: false,
    subcategories: [
      { label: 'Tote Bags', href: '/category/bags/tote' },
      { label: 'Shoulder Bags', href: '/category/bags/shoulder' },
      { label: 'Clutches', href: '/category/bags/clutches' },
      { label: 'Crossbody', href: '/category/bags/crossbody' },
      { label: 'Mini Bags', href: '/category/bags/mini' },
      { label: 'Travel', href: '/category/bags/travel' },
    ],
  },
  {
    label: 'Shoes',
    href: '/category/shoes',
    hasMegaMenu: false,
    subcategories: [
      { label: 'Heels', href: '/category/shoes/heels' },
      { label: 'Flats', href: '/category/shoes/flats' },
      { label: 'Sneakers', href: '/category/shoes/sneakers' },
      { label: 'Sandals', href: '/category/shoes/sandals' },
      { label: 'Boots', href: '/category/shoes/boots' },
      { label: 'Loafers', href: '/category/shoes/loafers' },
    ],
  },
  {
    label: 'Jewelry',
    href: '/category/jewelry',
    hasMegaMenu: false,
    subcategories: [
      { label: 'Necklaces', href: '/category/jewelry/necklaces' },
      { label: 'Earrings', href: '/category/jewelry/earrings' },
      { label: 'Bracelets', href: '/category/jewelry/bracelets' },
      { label: 'Rings', href: '/category/jewelry/rings' },
      { label: 'Brooches', href: '/category/jewelry/brooches' },
      { label: 'Fine Jewelry', href: '/category/jewelry/fine' },
    ],
  },
  {
    label: 'Accessories',
    href: '/category/accessories',
    hasMegaMenu: false,
    subcategories: [
      { label: 'Scarves & Wraps', href: '/category/accessories/scarves' },
      { label: 'Belts', href: '/category/accessories/belts' },
      { label: 'Hats', href: '/category/accessories/hats' },
      { label: 'Gloves', href: '/category/accessories/gloves' },
      { label: 'Sunglasses', href: '/category/accessories/sunglasses' },
      { label: 'Tech Accessories', href: '/category/accessories/tech' },
    ],
  },
];

const LUXURY_EASE = [0.22, 1, 0.36, 1] as const;

/* ================================================================ */
/*  Framer variants                                                  */
/* ================================================================ */

const announcementVariants = {
  enter: (direction: number) => ({
    y: direction > 0 ? 12 : -12,
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.45, ease: LUXURY_EASE },
  },
  exit: (direction: number) => ({
    y: direction < 0 ? 12 : -12,
    opacity: 0,
    transition: { duration: 0.35, ease: LUXURY_EASE },
  }),
};

const megaMenuVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: LUXURY_EASE, staggerChildren: 0.04 },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.25, ease: LUXURY_EASE },
  },
};

const megaMenuItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: LUXURY_EASE },
  },
};

const dropdownVariants = {
  hidden: { opacity: 0, y: -6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: LUXURY_EASE, staggerChildren: 0.03 },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.2, ease: LUXURY_EASE },
  },
};

const dropdownItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: LUXURY_EASE },
  },
};

const mobileMenuVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.45, ease: LUXURY_EASE },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3, ease: LUXURY_EASE },
  },
};

const mobileLinkVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.15 + i * 0.07,
      duration: 0.55,
      ease: LUXURY_EASE,
    },
  }),
  exit: { opacity: 0, y: 15, transition: { duration: 0.2 } },
};

const badgeVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0, opacity: 0 },
};

/* ================================================================ */
/*  Announcement Bar                                                 */
/* ================================================================ */

function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(false);
  const [[current, direction], setCurrent] = useState([0, 1]);

  useEffect(() => {
    const stored = localStorage.getItem('maison-announcement-dismissed');
    if (stored === 'true') {
      setDismissed(true);
    }
  }, []);

  useEffect(() => {
    if (dismissed) return;
    const interval = setInterval(() => {
      setCurrent((prev) => {
        const nextIndex = (prev[0] + 1) % ANNOUNCEMENTS.length;
        return [nextIndex, 1];
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [dismissed]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem('maison-announcement-dismissed', 'true');
  }, []);

  if (dismissed) return null;

  return (
    <div className="relative h-8 bg-[#0A0A0A] overflow-hidden flex items-center justify-center">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={current}
          custom={direction}
          variants={announcementVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 flex items-center justify-center"
        >
          <p className="font-['Inter'] text-[10px] uppercase tracking-[0.2em] text-white/60">
            {ANNOUNCEMENTS[current]}
          </p>
        </motion.div>
      </AnimatePresence>

      <button
        onClick={handleDismiss}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors duration-300"
        aria-label="Dismiss announcement"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ================================================================ */
/*  Animated Badge                                                   */
/* ================================================================ */

function AnimatedBadge({ count }: { count: number }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key={`badge-${count}`}
          variants={badgeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#C9A96E] text-[10px] font-semibold leading-none text-black"
        >
          {count > 9 ? '9+' : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/* ================================================================ */
/*  Desktop Nav Link with layoutId underline                         */
/* ================================================================ */

function NavLink({
  label,
  href,
  isActive,
  onMouseEnter,
  onMouseLeave,
}: {
  label: string;
  href: string;
  isActive: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <a
      href={href}
      className="group relative px-3 py-2"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span
        className={`font-['Inter'] text-xs uppercase tracking-[0.12em] transition-colors duration-300 ${
          isActive ? 'text-white' : 'text-white/70 group-hover:text-white'
        }`}
      >
        {label}
      </span>
      {isActive && (
        <motion.span
          layoutId="nav-underline"
          className="absolute bottom-1 left-3 right-3 h-px bg-[#C9A96E]"
          transition={{ duration: 0.45, ease: LUXURY_EASE }}
        />
      )}
    </a>
  );
}

/* ================================================================ */
/*  Mega Menu                                                        */
/* ================================================================ */

function MegaMenuPanel({
  category,
}: {
  category: NavCategory;
}) {
  if (!category.columns || !category.featured) return null;

  return (
    <motion.div
      variants={megaMenuVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="absolute left-0 right-0 top-full z-40 bg-[#0A0A0A] border-t border-white/5"
    >
      <div className="mx-auto max-w-7xl px-8 py-10">
        <div className="grid grid-cols-[1fr_1fr_1.1fr] gap-10">
          {category.columns.map((col) => (
            <motion.div key={col.heading} variants={megaMenuItemVariants}>
              <h3 className="font-['Inter'] text-[10px] uppercase tracking-[0.2em] text-[#C9A96E] mb-4">
                {col.heading}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="font-['Inter'] text-[13px] text-white/70 hover:text-white transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}

          {/* Featured editorial column */}
          <motion.div variants={megaMenuItemVariants} className="relative">
            <div className="relative aspect-[3/2] overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02]">
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-['Playfair_Display'] text-xl text-white/30 mb-1">
                  {category.label === 'Women' ? 'Spring / Summer' : 'New Season'}
                </span>
                <span className="font-['Inter'] text-[10px] uppercase tracking-[0.2em] text-[#C9A96E]/40">
                  2026
                </span>
              </div>
            </div>
            <a
              href={category.featured.ctaHref}
              className="mt-4 inline-flex items-center gap-1.5 font-['Inter'] text-xs uppercase tracking-[0.15em] text-white/80 hover:text-[#C9A96E] transition-colors duration-300"
            >
              {category.featured.cta}
              <ChevronRight className="h-3 w-3" />
            </a>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================ */
/*  Simple Dropdown                                                  */
/* ================================================================ */

function SimpleDropdown({
  subcategories,
}: {
  subcategories: Subcategory[];
}) {
  return (
    <motion.div
      variants={dropdownVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="absolute left-0 top-full z-40 min-w-[200px] bg-[#0A0A0A] border-t border-white/5 py-6 px-6"
    >
      <ul className="space-y-2.5">
        {subcategories.map((sub) => (
          <motion.li key={sub.label} variants={dropdownItemVariants}>
            <a
              href={sub.href}
              className="block font-['Inter'] text-[13px] text-white/70 hover:text-white transition-colors duration-200"
            >
              {sub.label}
            </a>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

/* ================================================================ */
/*  Mobile Menu                                                      */
/* ================================================================ */

function MobileMenu({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const handleLinkClick = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={mobileMenuVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[60] bg-[#0A0A0A] flex flex-col"
        >
          {/* Gold accent line at top */}
          <div className="h-px bg-[#C9A96E]/40" />

          {/* Close button */}
          <div className="flex justify-end px-6 py-5">
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors duration-300"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Centered links */}
          <nav className="flex-1 flex flex-col items-center justify-center">
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
                    onClick={handleLinkClick}
                    className="font-['Playfair_Display'] text-[40px] font-light text-white/90 hover:text-[#C9A96E] transition-colors duration-300"
                  >
                    {link.label}
                  </a>
                </motion.li>
              ))}
            </ul>
          </nav>

          {/* Bottom links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5, ease: LUXURY_EASE }}
            className="pb-12 flex items-center justify-center gap-6 font-['Inter'] text-xs uppercase tracking-[0.2em] text-white/40"
          >
            <a
              href="#"
              onClick={handleLinkClick}
              className="hover:text-[#C9A96E] transition-colors duration-300"
            >
              Account
            </a>
            <span className="text-[#C9A96E]/30">&#183;</span>
            <a
              href="#"
              onClick={handleLinkClick}
              className="hover:text-[#C9A96E] transition-colors duration-300"
            >
              Wishlist
            </a>
            <span className="text-[#C9A96E]/30">&#183;</span>
            <a
              href="#"
              onClick={handleLinkClick}
              className="hover:text-[#C9A96E] transition-colors duration-300"
            >
              Contact
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================================================================ */
/*  Main Navbar                                                      */
/* ================================================================ */

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { scrollY } = useScroll();

  const hydrated = useHydrated();

  const cartItemCount = useCartStore((s) => s.getItemCount());
  const wishlistCount = useWishlistStore((s) => s.getCount());
  const toggleCart = useCartStore((s) => s.toggleCart);
  const openSearch = useUIStore((s) => s.openSearch);
  const mobileMenuOpen = useUIStore((s) => s.mobileMenuOpen);
  const openMobileMenu = useUIStore((s) => s.openMobileMenu);
  const closeMobileMenu = useUIStore((s) => s.closeMobileMenu);

  /* ---- Scroll detection ---- */
  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 40);
  });

  /* ---- Body scroll lock ---- */
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

  /* ---- Mega menu hover handlers (with 300ms delay) ---- */
  const handleNavEnter = useCallback((label: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(label);
    }, 300);
  }, []);

  const handleNavLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 200);
  }, []);

  const handleDropdownEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const handleDropdownLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 200);
  }, []);

  /* Cleanup timeout on unmount */
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  /* ---- Compute total offset for fixed position ---- */
  const [announcementVisible, setAnnouncementVisible] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('maison-announcement-dismissed');
    if (stored === 'true') {
      setAnnouncementVisible(false);
    }
  }, []);

  const topOffset = announcementVisible ? 32 : 0;

  return (
    <>
      {/* Announcement Bar */}
      {announcementVisible && <AnnouncementBar />}

      {/* Main Navbar Header */}
      <motion.header
        className="fixed left-0 right-0 z-50"
        initial={false}
        animate={{
          backgroundColor: scrolled
            ? 'rgba(10, 10, 10, 0.85)'
            : 'rgba(10, 10, 10, 0)',
          backdropFilter: scrolled ? 'blur(24px)' : 'blur(0px)',
        }}
        transition={{ duration: 0.5, ease: LUXURY_EASE }}
        style={{
          top: topOffset,
          WebkitBackdropFilter: scrolled ? 'blur(24px)' : 'blur(0px)',
        }}
      >
        {/* Subtle bottom border on scroll */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px bg-white/5"
          initial={{ opacity: 0 }}
          animate={{ opacity: scrolled ? 1 : 0 }}
          transition={{ duration: 0.5, ease: LUXURY_EASE }}
        />

        <nav className="mx-auto flex h-16 md:h-[72px] max-w-7xl items-center justify-between px-5 md:px-8">
          {/* Left: Mobile hamburger + Desktop nav links */}
          <div className="flex items-center gap-1">
            {/* Mobile hamburger */}
            <button
              className="md:hidden text-white/80 hover:text-white transition-colors duration-300 p-2 -ml-2"
              onClick={openMobileMenu}
              aria-label="Open menu"
            >
              <Menu className="h-[18px] w-[18px]" />
            </button>

            {/* Desktop nav links */}
            <ul className="hidden md:flex items-center gap-0">
              {NAV_LINKS.map((link) => {
                const hasDropdown =
                  link.hasMegaMenu || (link.subcategories && link.subcategories.length > 0);
                return (
                  <li
                    key={link.label}
                    className="relative"
                    onMouseEnter={
                      hasDropdown ? () => handleNavEnter(link.label) : undefined
                    }
                    onMouseLeave={
                      hasDropdown ? handleNavLeave : undefined
                    }
                  >
                    <NavLink
                      label={link.label}
                      href={link.href}
                      isActive={activeDropdown === link.label}
                      onMouseEnter={
                        hasDropdown ? () => handleNavEnter(link.label) : undefined
                      }
                      onMouseLeave={
                        hasDropdown ? handleNavLeave : undefined
                      }
                    />

                    {/* Dropdown / Mega menu */}
                    {hasDropdown && activeDropdown === link.label && (
                      <div
                        onMouseEnter={handleDropdownEnter}
                        onMouseLeave={handleDropdownLeave}
                      >
                        <AnimatePresence>
                          {link.hasMegaMenu ? (
                            <MegaMenuPanel category={link} />
                          ) : link.subcategories ? (
                            <SimpleDropdown subcategories={link.subcategories} />
                          ) : null}
                        </AnimatePresence>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Center: Logo */}
          <a href="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none">
            <motion.span
              className="font-['Playfair_Display'] text-[28px] font-semibold tracking-wide text-[#C9A96E] inline-block"
              whileHover={{ letterSpacing: '0.25em' }}
              transition={{ duration: 0.45, ease: LUXURY_EASE }}
            >
              MAISON
            </motion.span>
          </a>

          {/* Right: Action icons */}
          <div className="flex items-center gap-0.5">
            {/* Search */}
            <button
              className="p-2 text-white/80 hover:text-white transition-colors duration-300"
              onClick={openSearch}
              aria-label="Search"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>

            {/* Wishlist */}
            <button className="relative p-2 text-white/80 hover:text-white transition-colors duration-300" aria-label="Wishlist">
              <Heart className="h-[18px] w-[18px]" />
              {hydrated && <AnimatedBadge count={wishlistCount} />}
            </button>

            {/* Shopping bag */}
            <button
              className="relative p-2 text-white/80 hover:text-white transition-colors duration-300"
              onClick={toggleCart}
              aria-label="Shopping bag"
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
              {hydrated && <AnimatedBadge count={cartItemCount} />}
            </button>

            {/* User */}
            <button className="p-2 text-white/80 hover:text-white transition-colors duration-300" aria-label="Account">
              <User className="h-[18px] w-[18px]" />
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <MobileMenu isOpen={mobileMenuOpen} onClose={closeMobileMenu} />
    </>
  );
}
