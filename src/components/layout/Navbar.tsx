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
  ArrowRight,
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
  heroImage?: string;
}

interface PreviewProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  brand?: string;
}

/* ================================================================ */
/*  Navigation Data — 4-Column Mega Menu Structure                   */
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
    heroImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=500&h=640&fit=crop',
    columns: [
      {
        heading: 'Ready-to-Wear',
        links: [
          { label: 'Dresses', href: '/category/women' },
          { label: 'Gowns & Evening', href: '/category/women' },
          { label: 'Tops & Blouses', href: '/category/women' },
          { label: 'Knitwear & Cashmere', href: '/category/women' },
          { label: 'Coats & Outerwear', href: '/category/women' },
          { label: 'Skirts', href: '/category/women' },
          { label: 'Pants & Trousers', href: '/category/women' },
        ],
      },
      {
        heading: 'Accessories',
        links: [
          { label: 'Handbags', href: '/category/bags' },
          { label: 'Shoes', href: '/category/shoes' },
          { label: 'Fine Jewelry', href: '/category/jewelry' },
          { label: 'Scarves & Wraps', href: '/category/accessories' },
          { label: 'Belts', href: '/category/accessories' },
          { label: 'Sunglasses', href: '/category/accessories' },
        ],
      },
    ],
    featured: {
      image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=480&h=640&fit=crop',
      alt: 'Women Spring/Summer 2026',
      cta: 'Discover the Collection',
      ctaHref: '/category/women?sort=newest',
    },
  },
  {
    label: 'Men',
    href: '/category/men',
    hasMegaMenu: true,
    heroImage: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=500&h=640&fit=crop',
    columns: [
      {
        heading: 'Tailoring',
        links: [
          { label: 'Suits & Blazers', href: '/category/men' },
          { label: 'Dress Shirts', href: '/category/men' },
          { label: 'Trousers', href: '/category/men' },
          { label: 'Knitwear & Polos', href: '/category/men' },
          { label: 'Outerwear', href: '/category/men' },
          { label: 'T-Shirts', href: '/category/men' },
        ],
      },
      {
        heading: 'Accessories',
        links: [
          { label: 'Briefcases & Bags', href: '/category/bags' },
          { label: 'Shoes', href: '/category/shoes' },
          { label: 'Watches', href: '/category/jewelry' },
          { label: 'Belts & Ties', href: '/category/accessories' },
          { label: 'Cufflinks', href: '/category/jewelry' },
          { label: 'Sunglasses', href: '/category/accessories' },
        ],
      },
    ],
    featured: {
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=480&h=640&fit=crop',
      alt: 'Men New Season',
      cta: 'Explore New Arrivals',
      ctaHref: '/category/men?sort=newest',
    },
  },
  {
    label: 'Bags',
    href: '/category/bags',
    hasMegaMenu: true,
    heroImage: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&h=640&fit=crop',
    columns: [
      {
        heading: 'By Style',
        links: [
          { label: 'Tote Bags', href: '/category/bags' },
          { label: 'Shoulder Bags', href: '/category/bags' },
          { label: 'Clutches & Evening', href: '/category/bags' },
          { label: 'Crossbody', href: '/category/bags' },
          { label: 'Mini Bags', href: '/category/bags' },
          { label: 'Travel & Luggage', href: '/category/bags' },
        ],
      },
      {
        heading: 'By Material',
        links: [
          { label: 'Leather', href: '/category/bags' },
          { label: 'Exotic Skin', href: '/category/bags' },
          { label: 'Canvas & Nylon', href: '/category/bags' },
          { label: 'Suede', href: '/category/bags' },
          { label: 'Quilted', href: '/category/bags' },
          { label: 'Limited Edition', href: '/category/bags' },
        ],
      },
    ],
    featured: {
      image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=480&h=640&fit=crop',
      alt: 'The Art of Leather',
      cta: 'Shop Bags',
      ctaHref: '/category/bags',
    },
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
      { label: 'Tech', href: '/category/accessories' },
    ],
  },
  {
    label: 'Nova AI Chat',
    href: '/chat',
    hasMegaMenu: false,
  },
];

/* ================================================================ */
/*  Animation Easing & Variants                                      */
/* ================================================================ */

const EASE = [0.22, 1, 0.36, 1] as const;

const announceVariants = {
  enter: (d: number) => ({ y: d > 0 ? 12 : -12, opacity: 0 }),
  center: { y: 0, opacity: 1, transition: { duration: 0.5, ease: EASE } },
  exit: (d: number) => ({ y: d < 0 ? 12 : -12, opacity: 0, transition: { duration: 0.3, ease: EASE } }),
};

const megaVariants = {
  hidden: { opacity: 0, y: -8, transition: { duration: 0.01 } },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, staggerChildren: 0.03, delayChildren: 0.06 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.22, ease: EASE } },
};

const megaColVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

const megaLinkVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: EASE } },
};

const dropVariants = {
  hidden: { opacity: 0, y: -6, transition: { duration: 0.01 } },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE, staggerChildren: 0.025, delayChildren: 0.04 } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.18, ease: EASE } },
};

const dropItemVars = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: EASE } },
};

const mobileVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.3, ease: EASE } },
};

const mobileLinkVars = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.18 + i * 0.06, duration: 0.6, ease: EASE } }),
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
    const id = setInterval(() => { setDir(1); setIdx((p) => (p + 1) % ANNOUNCEMENTS.length); }, 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative z-[52] h-8 bg-[#0A0A0A] flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait" custom={dir}>
        <motion.p
          key={idx} custom={dir} variants={announceVariants}
          initial="enter" animate="center" exit="exit"
          className="font-[\'Inter\'] text-[10px] uppercase tracking-[0.22em] text-white/50"
        >
          {ANNOUNCEMENTS[idx]}
        </motion.p>
      </AnimatePresence>
      <button
        onClick={onDismiss} aria-label="Dismiss"
        className="absolute right-5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors duration-300"
      >
        <X className="h-3 w-3" strokeWidth={1.5} />
      </button>
    </div>
  );
}

/* ================================================================ */
/*  Animated Badge                                                   */
/* ================================================================ */

function Badge({ count, dark }: { count: number; dark?: boolean }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
          transition={badgeSpring}
          className={
            'absolute -top-[2px] -right-[2px] flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-1 ' +
            'font-[\'Inter\'] text-[9px] font-bold leading-none ' +
            (dark ? 'bg-[#0A0A0A] text-white' : 'bg-[#C9A96E] text-black')
          }
        >
          {count > 9 ? '9+' : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/* ================================================================ */
/*  Desktop Nav Link — Gold underline on hover                       */
/* ================================================================ */

function NavLink({ label, href, isActive, dark, onEnter, onLeave }: {
  label: string; href: string; isActive: boolean; dark?: boolean;
  onEnter?: () => void; onLeave?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const textCls = dark
    ? (isActive || hovered ? 'text-[#0A0A0A]' : 'text-[#0A0A0A]/60')
    : (isActive || hovered ? 'text-white' : 'text-white/70');

  return (
    <a
      href={href} className="group relative px-3.5 py-2"
      onMouseEnter={() => { setHovered(true); onEnter?.(); }}
      onMouseLeave={() => { setHovered(false); onLeave?.(); }}
    >
      <span className={"relative z-10 font-[\'Inter\'] text-[11.5px] uppercase tracking-[0.12em] transition-colors duration-300 " + textCls}>
        {label}
      </span>
      <motion.span
        className="absolute bottom-1 left-3.5 right-3.5 h-[1.5px] bg-[#C9A96E] origin-left"
        initial={false}
        animate={{ scaleX: isActive || hovered ? 1 : 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      />
    </a>
  );
}

/* ================================================================ */
/*  4-Column Mega Menu — White Luxury Panel                          */
/* ================================================================ */

function MegaMenuPanel({ category, previews }: { category: NavCategory; previews: PreviewProduct[] }) {
  if (!category.columns || !category.featured) return null;

  return (
    <motion.div
      variants={megaVariants} initial="hidden" animate="visible" exit="exit"
      className="absolute left-1/2 -translate-x-1/2 top-full z-40 w-[min(1280px,95vw)]"
    >
      <div className="bg-white/[0.97] backdrop-blur-2xl shadow-[0_25px_60px_-12px_rgba(0,0,0,0.12)] border border-black/[0.04]">

        {/* Top gold accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#C9A96E]/30 to-transparent" />

        <div className="grid grid-cols-4 gap-0">

          {/* ── Column 1: Category heading + first column links ── */}
          <motion.div variants={megaColVariants} className="border-r border-black/[0.05] px-8 py-8 lg:py-10">
            {category.columns[0] && (
              <>
                <h3 className="font-[\'Playfair_Display\'] text-[22px] lg:text-[26px] text-[#0A0A0A] mb-6 leading-tight">
                  {category.columns[0].heading}
                </h3>
                <ul className="space-y-3">
                  {category.columns[0].links.map((link) => (
                    <motion.li key={link.label} variants={megaLinkVariants}>
                      <a href={link.href}
                        className="font-[\'Inter\'] text-[13px] text-[#0A0A0A]/55 hover:text-[#0A0A0A] transition-colors duration-200 inline-flex items-center gap-2.5 group/sub"
                      >
                        <span className="w-0 h-[1px] bg-[#C9A96E] group-hover/sub:w-2.5 transition-all duration-300" />
                        {link.label}
                      </a>
                    </motion.li>
                  ))}
                </ul>
              </>
            )}
          </motion.div>

          {/* ── Column 2: Second column links ── */}
          <motion.div variants={megaColVariants} className="border-r border-black/[0.05] px-8 py-8 lg:py-10">
            {category.columns[1] && (
              <>
                <h3 className="font-[\'Playfair_Display\'] text-[22px] lg:text-[26px] text-[#0A0A0A] mb-6 leading-tight">
                  {category.columns[1].heading}
                </h3>
                <ul className="space-y-3">
                  {category.columns[1].links.map((link) => (
                    <motion.li key={link.label} variants={megaLinkVariants}>
                      <a href={link.href}
                        className="font-[\'Inter\'] text-[13px] text-[#0A0A0A]/55 hover:text-[#0A0A0A] transition-colors duration-200 inline-flex items-center gap-2.5 group/sub"
                      >
                        <span className="w-0 h-[1px] bg-[#C9A96E] group-hover/sub:w-2.5 transition-all duration-300" />
                        {link.label}
                      </a>
                    </motion.li>
                  ))}
                </ul>
              </>
            )}
          </motion.div>

          {/* ── Column 3: Product Previews (Bestsellers) ── */}
          <motion.div variants={megaColVariants} className="border-r border-black/[0.05] px-6 py-8 lg:py-10">
            <h3 className="font-[\'Inter\'] text-[10px] uppercase tracking-[0.2em] text-[#C9A96E] mb-5 font-medium">
              Bestsellers
            </h3>
            <div className="space-y-5">
              {previews.slice(0, 3).map((p) => (
                <a key={p.id} href={`/product/${p.slug}`} className="group/prev flex gap-3.5 items-start">
                  <div className="relative h-[72px] w-[56px] flex-shrink-0 overflow-hidden bg-[#F5F4F2]">
                    <img src={p.image} alt={p.name} loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/prev:scale-105"
                    />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="font-[\'Inter\'] text-[12px] font-medium text-[#0A0A0A]/80 truncate group-hover/prev:text-[#0A0A0A] transition-colors">
                      {p.name}
                    </p>
                    {p.brand && (
                      <p className="font-[\'Inter\'] text-[10px] uppercase tracking-wider text-[#C9A96E]/70 mt-0.5">
                        {p.brand}
                      </p>
                    )}
                    <p className="font-[\'Inter\'] text-[12px] text-[#0A0A0A]/50 mt-1">
                      {'\$'}{p.price.toLocaleString()}
                    </p>
                  </div>
                </a>
              ))}
            </div>
            {previews.length > 0 && (
              <a href={category.href + '?sort=bestSeller'}
                className="mt-6 inline-flex items-center gap-1.5 font-[\'Inter\'] text-[11px] uppercase tracking-[0.15em] text-[#0A0A0A]/50 hover:text-[#C9A96E] transition-colors duration-300 group/view"
              >
                View All
                <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover/view:translate-x-0.5" />
              </a>
            )}
          </motion.div>

          {/* ── Column 4: Featured Collection Editorial ── */}
          <motion.div variants={megaColVariants} className="py-8 lg:py-10">
            <a href={category.featured.ctaHref} className="group/editorial block h-full">
              <div className="relative h-[260px] lg:h-[300px] overflow-hidden">
                <img
                  src={category.featured.image} alt={category.featured.alt}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover/editorial:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 lg:p-6">
                  <p className="font-[\'Inter\'] text-[10px] uppercase tracking-[0.2em] text-white/80 mb-1.5">
                    Featured Collection
                  </p>
                  <h4 className="font-[\'Playfair_Display\'] text-[18px] lg:text-[20px] text-white leading-snug mb-3">
                    {category.label === 'Women' ? 'Spring / Summer' : category.label === 'Men' ? 'New Season' : 'The Collection'}
                  </h4>
                  <span className="inline-flex items-center gap-1.5 font-[\'Inter\'] text-[11px] uppercase tracking-[0.15em] text-white/90 group-hover/editorial:text-[#C9A96E] transition-colors duration-300">
                    {category.featured.cta}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </a>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================ */
/*  Simple Light Dropdown                                            */
/* ================================================================ */

function LightDropdown({ subs }: { subs: Subcategory[] }) {
  return (
    <motion.div
      variants={dropVariants} initial="hidden" animate="visible" exit="exit"
      className="absolute left-1/2 -translate-x-1/2 top-full z-40 min-w-[240px] bg-white/[0.98] backdrop-blur-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-black/[0.04] py-7 px-6"
    >
      <div className="h-px bg-gradient-to-r from-transparent via-[#C9A96E]/20 to-transparent -mt-7 -mx-6 mb-6 pt-7" />
      <ul className="space-y-3">
        {subs.map((sub) => (
          <motion.li key={sub.label} variants={dropItemVars}>
            <a href={sub.href}
              className="font-[\'Inter\'] text-[13px] text-[#0A0A0A]/55 hover:text-[#0A0A0A] transition-colors duration-200 inline-flex items-center gap-2.5 group/d"
            >
              <span className="w-0 h-[1px] bg-[#C9A96E] group-hover/d:w-2.5 transition-all duration-300" />
              {sub.label}
            </a>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

/* ================================================================ */
/*  Mobile Menu — Full-screen White Luxury                            */
/* ================================================================ */

function MobileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={mobileVariants} initial="hidden" animate="visible" exit="exit"
          className="fixed inset-0 z-[60] bg-white flex flex-col"
        >
          {/* Gold line */}
          <div className="h-px bg-[#C9A96E]/40" />

          {/* Close */}
          <div className="flex justify-end px-6 py-5">
            <button onClick={onClose} aria-label="Close menu"
              className="text-[#0A0A0A]/40 hover:text-[#0A0A0A] transition-colors duration-300"
            >
              <X className="h-6 w-6" strokeWidth={1.5} />
            </button>
          </div>

          {/* Links */}
          <nav className="flex-1 flex flex-col items-center justify-center px-6">
            <ul className="flex flex-col items-center gap-4">
              {NAV_LINKS.map((link, i) => (
                <motion.li key={link.label} custom={i} variants={mobileLinkVars} initial="hidden" animate="visible" exit="exit">
                  <a href={link.href} onClick={onClose}
                    className="font-[\'Playfair_Display\'] text-[36px] md:text-[42px] font-light text-[#0A0A0A]/85 hover:text-[#C9A96E] transition-colors duration-300"
                  >
                    {link.label}
                  </a>
                </motion.li>
              ))}
            </ul>
          </nav>

          {/* Bottom */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.5 }}
            className="pb-14 flex flex-col items-center gap-5"
          >
            <div className="flex items-center gap-7 font-[\'Inter\'] text-[11px] uppercase tracking-[0.2em] text-[#0A0A0A]/30">
              <a href="#" onClick={onClose} className="hover:text-[#C9A96E] transition-colors duration-300">Account</a>
              <span className="text-[#C9A96E]/20 select-none">·</span>
              <a href="#" onClick={onClose} className="hover:text-[#C9A96E] transition-colors duration-300">Wishlist</a>
              <span className="text-[#C9A96E]/20 select-none">·</span>
              <a href="#" onClick={onClose} className="hover:text-[#C9A96E] transition-colors duration-300">Contact</a>
            </div>
            <div className="h-px w-10 bg-[#C9A96E]/25" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================================================================ */
/*  Main Navbar — Adaptive Light/Dark                                */
/* ================================================================ */

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [annDismissed, setAnnDismissed] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [previews, setPreviews] = useState<PreviewProduct[]>([]);
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

  const dark = !scrolled;

  /* ---- Announcement persistence ---- */
  useEffect(() => {
    if (localStorage.getItem('maison-ann-dismissed') === '1') setAnnDismissed(true);
  }, []);
  const dismissAnn = useCallback(() => { setAnnDismissed(true); localStorage.setItem('maison-ann-dismissed', '1'); }, []);

  /* ---- Scroll ---- */
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 50));

  /* ---- Fetch bestsellers for mega menu previews ---- */
  useEffect(() => {
    fetch('/api/products?bestSeller=true&limit=6')
      .then((r) => r.json())
      .then((d) => {
        const prods = (d.products || []).slice(0, 6);
        setPreviews(prods.map((p: { id: string; name: string; slug: string; price: number; images: string; brand?: { name: string } }) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : '',
          brand: p.brand?.name,
        })));
      })
      .catch(() => { /* ignore */ });
  }, []);

  /* ---- Body scroll lock ---- */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  /* ---- Hover handlers ---- */
  const schedule = useCallback((fn: () => void, ms: number) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(fn, ms);
  }, []);
  const cancel = useCallback(() => {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
  }, []);

  const enterNav = useCallback((l: string) => schedule(() => setActiveDropdown(l), 250), [schedule]);
  const leaveNav = useCallback(() => schedule(() => setActiveDropdown(null), 200), [schedule]);
  const enterPanel = useCallback(() => cancel(), [cancel]);
  const leavePanel = useCallback(() => schedule(() => setActiveDropdown(null), 200), [schedule]);
  useEffect(() => () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }, []);

  const topOffset = annDismissed ? 0 : 32;

  /* Color classes based on scroll state */
  const iconCls = dark ? 'text-white/75 hover:text-white' : 'text-[#0A0A0A]/60 hover:text-[#0A0A0A]';

  return (
    <>
      {/* Announcement Bar */}
      {!annDismissed && <AnnouncementBar onDismiss={dismissAnn} />}

      {/* Main Header */}
      <motion.header
        className="fixed left-0 right-0 z-50"
        initial={false}
        animate={{
          backgroundColor: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(10,10,10,0)',
          backdropFilter: scrolled ? 'blur(24px) saturate(1.5)' : 'blur(0px)',
        }}
        transition={{ duration: 0.5, ease: EASE }}
        style={{ top: topOffset, WebkitBackdropFilter: scrolled ? 'blur(24px) saturate(1.5)' : 'blur(0px)' }}
      >
        {/* Bottom border */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px"
          initial={{ opacity: 0 }}
          animate={{
            opacity: scrolled ? 1 : 0,
            background: scrolled
              ? 'linear-gradient(to right, transparent, rgba(0,0,0,0.06), transparent)'
              : 'linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)',
          }}
          transition={{ duration: 0.5, ease: EASE }}
        />

        <nav className="mx-auto flex h-16 md:h-[72px] max-w-[1400px] items-center justify-between px-5 md:px-10 lg:px-12">

          {/* Left: Hamburger + Nav Links */}
          <div className="flex items-center">
            <button className={`md:hidden p-2 -ml-2 transition-colors duration-300 ${iconCls}`}
              onClick={openMobile} aria-label="Open menu"
            >
              <Menu className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </button>

            <ul className="hidden md:flex items-center">
              {NAV_LINKS.map((link) => {
                const hasDrop = link.hasMegaMenu || (link.subcategories && link.subcategories.length > 0);
                const showDrop = hasDrop && activeDropdown === link.label;
                return (
                  <li key={link.label} className="relative"
                    onMouseEnter={hasDrop ? () => enterNav(link.label) : undefined}
                    onMouseLeave={hasDrop ? leaveNav : undefined}
                  >
                    <NavLink label={link.label} href={link.href} isActive={!!showDrop} dark={dark}
                      onEnter={hasDrop ? () => enterNav(link.label) : undefined}
                      onLeave={hasDrop ? leaveNav : undefined}
                    />
                    {hasDrop && (
                      <div onMouseEnter={enterPanel} onMouseLeave={leavePanel}>
                        <AnimatePresence>
                          {showDrop && (
                            link.hasMegaMenu
                              ? <MegaMenuPanel category={link} previews={previews} />
                              : link.subcategories
                                ? <LightDropdown subs={link.subcategories} />
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

          {/* Center: Logo */}
          <a href="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none z-10">
            <motion.span
              className={`font-['Playfair_Display'] text-[26px] md:text-[28px] font-semibold tracking-[0.08em] inline-block origin-center transition-colors duration-500 ${dark ? 'text-[#C9A96E]' : 'text-[#0A0A0A]'}`}
              whileHover={{ letterSpacing: '0.22em' }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              MAISON
            </motion.span>
          </a>

          {/* Right: Action Icons */}
          <div className="flex items-center gap-0.5 md:gap-1">
            <button className={`relative z-10 p-2.5 transition-colors duration-300 ${iconCls}`}
              onClick={openSearch} aria-label="Search"
            >
              <Search className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </button>
            <button className={`relative z-10 p-2.5 transition-colors duration-300 ${iconCls}`} aria-label="Wishlist">
              <Heart className="h-[18px] w-[18px]" strokeWidth={1.5} />
              {hydrated && <Badge count={wishCount} dark={!dark} />}
            </button>
            <button className={`relative z-10 p-2.5 transition-colors duration-300 ${iconCls}`}
              onClick={toggleCart} aria-label="Shopping bag"
            >
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.5} />
              {hydrated && <Badge count={cartCount} dark={!dark} />}
            </button>
            <button className={`hidden md:block relative z-10 p-2.5 transition-colors duration-300 ${iconCls}`}
              aria-label="Account"
            >
              <User className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile Menu */}
      <MobileMenu isOpen={mobileOpen} onClose={closeMobile} />
    </>
  );
}
