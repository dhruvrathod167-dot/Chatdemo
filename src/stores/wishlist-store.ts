import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type WishlistItem = {
  productId: string;
  name: string;
  price: number;
  image: string;
  addedAt: string;
};

type WishlistState = {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  getCount: () => number;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const { items } = get();
        if (items.find((i) => i.productId === item.productId)) return;
        set({ items: [...items, item] });
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.productId !== productId) });
      },

      isInWishlist: (productId) => {
        return get().items.some((i) => i.productId === productId);
      },

      getCount: () => get().items.length,
    }),
    { name: 'maison-wishlist' }
  )
);
