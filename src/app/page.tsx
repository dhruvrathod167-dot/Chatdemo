'use client';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CartSidebar from '@/components/layout/CartSidebar';
import SearchOverlay from '@/components/layout/SearchOverlay';
import QuickViewModal from '@/components/layout/QuickViewModal';
import HeroSection from '@/components/sections/HeroSection';
import FeaturedCollections from '@/components/sections/FeaturedCollections';
import LuxuryCategories from '@/components/sections/LuxuryCategories';
import NewArrivals from '@/components/sections/NewArrivals';
import BestSellers from '@/components/sections/BestSellers';
import TrendingProducts from '@/components/sections/TrendingProducts';
import DesignerCollections from '@/components/sections/DesignerCollections';
import VideoCampaign from '@/components/sections/VideoCampaign';
import BrandStory from '@/components/sections/BrandStory';
import EditorialSection from '@/components/sections/EditorialSection';
import Testimonials from '@/components/sections/Testimonials';
import SocialProof from '@/components/sections/SocialProof';
import InstagramGallery from '@/components/sections/InstagramGallery';
import NewsletterSection from '@/components/sections/NewsletterSection';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* 1. Cinematic Hero Section */}
        <HeroSection />

        {/* 2. Featured Collections */}
        <FeaturedCollections />

        {/* 3. New Arrivals */}
        <NewArrivals />

        {/* 4. Best Sellers */}
        <BestSellers />

        {/* 5. Trending Now (Dark) */}
        <TrendingProducts />

        {/* 6. Luxury Categories */}
        <LuxuryCategories />

        {/* 7. Designer Collections */}
        <DesignerCollections />

        {/* 8. Video Campaign */}
        <VideoCampaign />

        {/* 9. Brand Story (Dark) */}
        <BrandStory />

        {/* 10. Editorial Section */}
        <EditorialSection />

        {/* 11. Testimonials */}
        <Testimonials />

        {/* 12. Social Proof / Stats (Dark) */}
        <SocialProof />

        {/* 13. Newsletter */}
        <NewsletterSection />

        {/* 14. Instagram Gallery */}
        <InstagramGallery />
      </main>

      {/* 15. Premium Footer */}
      <Footer />

      {/* Global Overlays */}
      <CartSidebar />
      <SearchOverlay />
      <QuickViewModal />
    </div>
  );
}
