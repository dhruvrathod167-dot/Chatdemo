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
/*  Navigation Data                                                  */
/* ================================================================ */

const ANNOUNCEMENTS = [
  'Complimentary shipping on orders over $500',
  'New Season — Spring/Summer 2026 Collection',
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
          { label: 'Dresses', href: '/category/women' },
          { label: 'Gowns', href: '/category/women' },
          { label: 'Tops & Blouses', href: '/category/women' },
          { label: 'Knitwear', href: '/category/women' },
          { label: 'Coats & Jackets', href: '/category/women' },
          { label: 'Skirts', href: '/category/women' },
          { label: 'Pants & Trousers', href: '/category/women' },
        ],
      },
      {
        heading: 'Accessories',
        links: [
          { label: 'Bags', href: '/category/bags' },
          { label: 'Shoes', href: '/category/shoes' },
          { label: 'Jewelry', href: '/category/jewelry' },
          { label: 'Scarves', href: '/category/accessories' },
          { label: 'Belts', href: '/category/accessories' },
          { label: 'Sunglasses', href: '/category/accessories' },
        ],
      },
    ],
    featured: {
      image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&h=400&fit=crop',
      alt: 'Women Spring/Summer 2026',
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
          { label: 'Suits & Blazers', href: '/category/men' },
          { label: 'Shirts', href: '/category/men' },
          { label: 'Trousers', href: '/category/men' },
          { label: 'Knitwear', href: '/category/men' },
          { label: 'Outerwear', href: '/category/men' },
          { label: 'T-Shirts & Polos', href: '/category/men' },
        ],
      },
      {
        heading: 'Accessories',
        links: [
          { label: 'Bags', href: '/category/bags' },
          { label: 'Shoes', href: '/category/shoes' },
          { label: 'Watches', href: '/category/jewelry' },
          { label: 'Belts', href: '/category/accessories' },
          { label: 'Ties', href: '/category/accessories' },
          { label: 'Cufflinks', href: '/category/jewelry' },
        ],
      },
    ],
    featured: {
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop',
      alt: 'Men New Season',
      cta: 'New Season',
      ctaHref: '/category/men?sort=newest',
    },
  },
  {
    label: 'Bags',
    href: '/category/bags',
    hasMegaMenu: false,
    subcategories: [
      { label: 'Tote Bags', href: '/category/bags' },
      { label: 'Shoulder Bags', href: '/category/bags' },
      { label: 'Clutches', href: '/category/bags' },
      { label: 'Crossbody', href: '/category/bags' },
      { label: 'Mini Bags', href: '/category/bags' },
      { label: 'Travel & Luggage', href: '/category/bags' },
    ],
  },
  {
    label: 'Shoes',
    href: '/category/shoes',
    hasMegaMenu: false,
    subcategories: [
      { label: 'Heels', href: '/category/shoes' },
      { label: 'Flats', href: '/category/shoes' },
      { label: 'Sneakers', href: '/category/shoes' },
      { label: 'Sandals', href: '/category/shoes' },
      { label: 'Boots', href: '/category/shoes' },
      { label: 'Loafers', href: '/category/shoes' },
    ],
  },
  {
    label: 'Jewelry',
    href: '/category/jewelry',
    hasMegaMenu: false,
    subcategories: [
      { label: 'Necklaces', href: '/category/jewelry' },
      { label: 'Earrings', href: '/category/jewelry' },
      { label: 'Bracelets', href: '/category/jewelry' },
      { label: 'Rings', href: '/category/jewelry' },
      { label: 'Brooches', href: '/category/jewelry' },
      { label: 'Fine Jewelry', href: '/category/jewelry' },
    ],
  },
  {
    label: 'Accessories',
    href: '/category/accessories',
    hasMegaMenu: false,
    subcategories: [
      { label: 'Scarves & Wraps', href: '/category/accessories' },
      { label: 'Belts', href: '/category/accessories' },
      { label: 'Hats', href: '/category/accessories' },
      { label: 'Gloves', href: '/category/accessories' },
      { label: 'Sunglasses', href: '/category/accessories' },
      { label: 'Tech Accessories', href: '/category/accessories' },
    ],
  },
];

/* ================================================================ */
/*  Animation Constants                                              */
/* ================================================================ */

const EASE = [0.22, 1, 0.36, 1] as const;

const announceVariants = {
  enter: (d: number) => ({ y: d > 0 ? 14 : -14, opacity: 0 }),
  center: { y: 0, opacity: 1, transition: { duration: 0.5, ease: EASE } },
  exit: (d: number) => ({ y: d < 0 ? 14 : -14, opacity: 0, transition: { duration: 0.3, ease: EASE } }),
};

const megaVariants = {
  hidden: { opacity: 0, y: -10, transition: { duration: 0.01 } },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.4, ease: EASE, staggerChildren: 0.035, delayChildren: 0.05 },
  },
  exit: { opacity: 0, y: -6, transition: { duration: 0.2, ease: EASE } },
};

const megaItemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

const dropVariants = {
  hidden: { opacity: 0, y: -8, transition: { duration: 0.01 } },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.3, ease: EASE, staggerChildren: 0.025, delayChildren: 0.03 },
  },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18, ease: EASE } },
};

const dropItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: EASE } },
};

const mobileVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.3, ease: EASE } },
};

const mobileLinkVars = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.2 + i * 0.065, duration: 0.6, ease: EASE },
  }),
  exit: { opacity: 0, y: 20, transition: { duration: 0.2 } },
};

const badgeSpring = { type: 'spring' as const, stiffness: 550, damping: 28 };

/* ================================================================ */
/*  Announcement Bar                                                 */
/* ================================================================ */

function AnnouncementBar({ onDismiss }: { onDismiss: () => void }) {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    const id = setInterval(() => {
      setDir(1);
      setIdx((p) => (p + 1) % ANNOUNCEMENTS.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative z-[52] h-8 bg-[#0A0A0A] flex items-center justify-center overflow-hidden">
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-center">
        <div className="h-px w-8 bg-[#C9A96E]/20" />
      </div>

      <AnimatePresence mode="wait" custom={dir}>
        <motion.p
          key={idx}
          custom={dir}
          variants={announceVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="font-['Inter'] text-[10px] uppercase tracking-[0.22em] text-white/55"
        >
          {ANNOUNCEMENTS[idx]}
        </motion.p>
      </AnimatePresence>

      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex justify-center">
        <div className="h-px w-8 bg-[#C9A96E]/20" />
      </div>

      <button
        onClick={onDismiss}
        className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors duration-300"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" strokeWidth={1.5} />
      </button>
    </div>
  );
}

/* ================================================================ */
/*  Animated Badge                                                   */
/* ================================================================ */

function Badge({ count }: { count: number }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={badgeSpring}
          className="absolute -top-[2px] -right-[2px] flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[#C9A96E] px-1 font-['Inter'] text-[9px] font-bold leading-none text-black"
        >
          {count > 9 ? '9+' : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/* ================================================================ */
/*  Desktop Nav Link with hover underline                            */
/* ================================================================ */

function NavLink({
  label,
  href,
  isActive,
  onEnter,
  onLeave,
}: {
  label: string;
  href: string;
  isActive: boolean;
  onEnter?: () => void;
  onLeave?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={href}
      className="group relative px-3.5 py-2"
      onMouseEnter={() => { setHovered(true); onEnter?.(); }}
      onMouseLeave={() => { setHovered(false); onLeave?.(); }}
    >
      <span
        className={
          'relative z-10 font-[\'Inter\'] text-[11.5px] uppercase tracking-[0.13em] transition-colors duration-300 ' +
          (isActive || hovered ? 'text-white' : 'text-white/65')
        }
      >
        {label}
      </span>

      {/* Gold underline — always renders, animates width */}
      <motion.span
        className="absolute bottom-0.5 left-3.5 right-3.5 h-px bg-[#C9A96E] origin-left"
        initial={false}
        animate={{ scaleX: isActive || hovered ? 1 : 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      />
    </a>
  );
}

/* ================================================================ */
/*  Mega Menu Panel                                                  */
/* ================================================================ */

function MegaMenu({ category }: { category: NavCategory }) {
  if (!category.columns || !category.featured) return null;

  return (
    <motion.div
      variants={megaVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="absolute left-0 right-0 top-full z-40 bg-[#0A0A0A]/[0.98] backdrop-blur-2xl border-t border-white/[0.04]"
    >
      <div className="mx-auto max-w-7xl px-8 lg:px-12 py-10 lg:py-12">
        <div className="grid grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr] gap-8 lg:gap-12">
          {category.columns.map((col) => (
            <motion.div key={col.heading} variants={megaItemVariants}>
              <h3 className="font-['Inter'] text-[10px] uppercase tracking-[0.22em] text-[#C9A96E] mb-5 font-medium">
                {col.heading}
              </h3>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="font-['Inter'] text-[13px] text-white/60 hover:text-white transition-colors duration-250 inline-flex items-center gap-2 group"
                    >
                      <span className="w-0 h-px bg-[#C9A96E] group-hover:w-3 transition-all duration-300" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}

          {/* Featured editorial */}
          <motion.div variants={megaItemVariants} className="relative hidden lg:block">
            <div className="relative aspect-[3/2] overflow-hidden group">
              <img
                src={category.featured.image}
                alt={category.featured.alt}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <p className="font-['Inter'] text-[10px] uppercase tracking-[0.2em] text-white/70 mb-2">
                  {category.label === 'Women' ? 'Spring / Summer 2026' : 'New Season 2026'}
                </p>
                <a
                  href={category.featured.ctaHref}
                  className="inline-flex items-center gap-2 font-['Inter'] text-xs uppercase tracking-[0.15em] text-white font-medium group/cta"
                >
                  {category.featured.cta}
                  <ChevronRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/cta:translate-x-1" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================ */
/*  Simple Dropdown                                                  */
/* ================================================================ */

function Dropdown({ subs }: { subs: Subcategory[] }) {
  return (
    <motion.div
      variants={dropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="absolute left-0 top-full z-40 min-w-[220px] bg-[#0A0A0A]/[0.98] backdrop-blur-2xl border-t border-white/[0.04] py-7 px-6"
    >
      <ul className="space-y-3">
        {subs.map((sub) => (
          <motion.li key={sub.label} variants={dropItemVariants}>
            <a
              href={sub.href}
              className="font-['Inter'] text-[13px] text-white/60 hover:text-white transition-colors duration-250 inline-flex items-center gap-2 group"
            >
              <span className="w-0 h-px bg-[#C9A96E] group-hover:w-3 transition-all duration-300" />
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

function MobileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={mobileVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[60] bg-[#0A0A0A] flex flex-col"
        >
          {/* Gold line */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#C9A96E]/50 to-transparent" />

          {/* Close */}
          <div className="flex justify-end px-6 py-5">
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white transition-colors duration-300"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" strokeWidth={1.5} />
            </button>
          </div>

          {/* Links */}
          <nav className="flex-1 flex flex-col items-center justify-center px-6">
            <ul className="flex flex-col items-center gap-5">
              {NAV_LINKS.map((link, i) => (
                <motion.li
                  key={link.label}
                  custom={i}
                  variants={mobileLinkVars}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <a
                    href={link.href}
                    onClick={onClose}
                    className="relative font-['Playfair_Display'] text-[38px] md:text-[44px] font-light text-white/90 hover:text-[#C9A96E] transition-colors duration-300"
                  >
                    {link.label}
                  </a>
                </motion.li>
              ))}
            </ul>
          </nav>

          {/* Bottom */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="pb-14 flex flex-col items-center gap-6"
          >
            <div className="flex items-center gap-8 font-['Inter'] text-[11px] uppercase tracking-[0.2em] text-white/35">
              <a href="#" onClick={onClose} className="hover:text-[#C9A96E] transition-colors duration-300">Account</a>
              <span className="text-[#C9A96E]/25 select-none">·</span>
              <a href="#" onClick={onClose} className="hover:text-[#C9A96E] transition-colors duration-300">Wishlist</a>
              <span className="text-[#C9A96E]/25 select-none">·</span>
              <a href="#" onClick={onClose} className="hover:text-[#C9A96E] transition-colors duration-300">Contact</a>
            </div>
            <div className="h-px w-12 bg-[#C9A96E]/20" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================================================================ */
/*  Main Navbar Component                                            */
/* ================================================================ */

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { scrollY } = useScroll();

  const hydrated = useHydrated();
  const cartCount = useCartStore((s) => s.getItemCount());
  const wishCount = useWishlistStore((s) => s.getCount());
  const toggleCart = useCartStore((s) => s.toggleCart);
  const openSearch = useUIStore((s) => s.openSearch);
  const mobileOpen = useUIStore((s) => s.mobileMenuOpen);
  const openMobile = useUIStore((s) => s.openMobileMenu);
  const closeMobile = useUIStore((s) => s.closeMobileMenu);

  /* ---- Announcement persistence ---- */
  useEffect(() => {
    if (localStorage.getItem('maison-ann-dismissed') === '1') setAnnouncementDismissed(true);
  }, []);

  const dismissAnnouncement = useCallback(() => {
    setAnnouncementDismissed(true);
    localStorage.setItem('maison-ann-dismissed', '1');
  }, []);

  /* ---- Scroll detection ---- */
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 50));

  /* ---- Body scroll lock ---- */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  /* ---- Hover handlers with delay ---- */
  const schedule = useCallback((fn: () => void, ms: number) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(fn, ms);
  }, []);

  const cancel = useCallback(() => {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
  }, []);

  const enterNav = useCallback((label: string) => schedule(() => setActiveDropdown(label), 280), [schedule]);
  const leaveNav = useCallback(() => schedule(() => setActiveDropdown(null), 180), [schedule]);
  const enterPanel = useCallback(() => cancel(), [cancel]);
  const leavePanel = useCallback(() => schedule(() => setActiveDropdown(null), 180), [schedule]);

  useEffect(() => () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }, []);

  const topOffset = announcementDismissed ? 0 : 32;

  return (
    <>
      {/* ---- Announcement Bar ---- */}
      {!announcementDismissed && <AnnouncementBar onDismiss={dismissAnnouncement} />}

      {/* ---- Main Header ---- */}
      <motion.header
        className="fixed left-0 right-0 z-50"
        initial={false}
        animate={{
          backgroundColor: scrolled ? 'rgba(10,10,10,0.88)' : 'rgba(10,10,10,0)',
          backdropFilter: scrolled ? 'blur(28px) saturate(1.4)' : 'blur(0px)',
        }}
        transition={{ duration: 0.55, ease: EASE }}
        style={{ top: topOffset, WebkitBackdropFilter: scrolled ? 'blur(28px) saturate(1.4)' : 'blur(0px)' }}
      >
        {/* Bottom border — fades in on scroll */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: scrolled ? 1 : 0 }}
          transition={{ duration: 0.55, ease: EASE }}
        />

        <nav className="mx-auto flex h-16 md:h-[72px] max-w-[1400px] items-center justify-between px-5 md:px-10 lg:px-12">

          {/* ---- Left: Hamburger (mobile) + Nav Links (desktop) ---- */}
          <div className="flex items-center">
            <button
              className="md:hidden relative z-10 p-2 -ml-2 text-white/80 hover:text-white transition-colors duration-300"
              onClick={openMobile}
              aria-label="Open menu"
            >
              <Menu className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </button>

            <ul className="hidden md:flex items-center">
              {NAV_LINKS.map((link) => {
                const hasDrop = link.hasMegaMenu || (link.subcategories && link.subcategories.length > 0);
                const showDrop = hasDrop && activeDropdown === link.label;

                return (
                  <li
                    key={link.label}
                    className="relative"
                    onMouseEnter={hasDrop ? () => enterNav(link.label) : undefined}
                    onMouseLeave={hasDrop ? leaveNav : undefined}
                  >
                    <NavLink
                      label={link.label}
                      href={link.href}
                      isActive={!!showDrop}
                    />

                    {/* Dropdown panels — AnimatePresence wraps conditionally */}
                    {hasDrop && (
                      <div
                        onMouseEnter={enterPanel}
                        onMouseLeave={leavePanel}
                      >
                        <AnimatePresence>
                          {showDrop && (
                            link.hasMegaMenu
                              ? <MegaMenu category={link} />
                              : link.subcategories
                                ? <Dropdown subs={link.subcategories} />
                                : null
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ---- Center: Logo ---- */}
          <a
            href="/"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none z-10"
          >
            <motion.span
              className="font-['Playfair_Display'] text-[26px] md:text-[28px] font-semibold tracking-[0.08em] text-[#C9A96E] inline-block origin-center"
              whileHover={{ letterSpacing: '0.22em' }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              MAISON
            </motion.span>
          </a>

          {/* ---- Right: Action Icons ---- */}
          <div className="flex items-center gap-0.5 md:gap-1">
            <button
              className="relative z-10 p-2.5 text-white/75 hover:text-white transition-colors duration-300"
              onClick={openSearch}
              aria-label="Search"
            >
              <Search className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </button>

            <button
              className="relative z-10 p-2.5 text-white/75 hover:text-white transition-colors duration-300"
              aria-label="Wishlist"
            >
              <Heart className="h-[18px] w-[18px]" strokeWidth={1.5} />
              {hydrated && <Badge count={wishCount} />}
            </button>

            <button
              className="relative z-10 p-2.5 text-white/75 hover:text-white transition-colors duration-300"
              onClick={toggleCart}
              aria-label="Shopping bag"
            >
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.5} />
              {hydrated && <Badge count={cartCount} />}
            </button>

            <button
              className="hidden md:block relative z-10 p-2.5 text-white/75 hover:text-white transition-colors duration-300"
              aria-label="Account"
            >
              <User className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </button>
          </div>
        </nav>
      </motion.header>

      {/* ---- Mobile Menu Overlay ---- */}
      <MobileMenu isOpen={mobileOpen} onClose={closeMobile} />
    </>
  );
}
