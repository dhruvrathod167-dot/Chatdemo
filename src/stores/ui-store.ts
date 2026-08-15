import { create } from 'zustand';

type UIState = {
  searchOpen: boolean;
  mobileMenuOpen: boolean;
  quickViewProduct: string | null;
  newsletterOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;
  setQuickViewProduct: (productId: string | null) => void;
  openNewsletter: () => void;
  closeNewsletter: () => void;
};

export const useUIStore = create<UIState>()((set, get) => ({
  searchOpen: false,
  mobileMenuOpen: false,
  quickViewProduct: null,
  newsletterOpen: false,

  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  toggleSearch: () => set({ searchOpen: !get().searchOpen }),
  openMobileMenu: () => set({ mobileMenuOpen: true }),
  closeMobileMenu: () => set({ mobileMenuOpen: false }),
  toggleMobileMenu: () => set({ mobileMenuOpen: !get().mobileMenuOpen }),
  setQuickViewProduct: (productId) => set({ quickViewProduct: productId }),
  openNewsletter: () => set({ newsletterOpen: true }),
  closeNewsletter: () => set({ newsletterOpen: false }),
}));
