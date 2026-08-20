'use client';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CartSidebar from '@/components/layout/CartSidebar';
import SearchOverlay from '@/components/layout/SearchOverlay';
import QuickViewModal from '@/components/layout/QuickViewModal';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartSidebar />
      <SearchOverlay />
      <QuickViewModal />
    </div>
  );
}
