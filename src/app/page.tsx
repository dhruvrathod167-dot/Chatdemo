'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CartSidebar from '@/components/layout/CartSidebar';
import SearchOverlay from '@/components/layout/SearchOverlay';
import QuickViewModal from '@/components/layout/QuickViewModal';
import MouseFollower from '@/components/shared/MouseFollower';
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
import SocialProof from '@/components/SocialProof';
import InstagramGallery from '@/components/sections/InstagramGallery';
import NewsletterSection from '@/components/sections/NewsletterSection';

gsap.registerPlugin(ScrollTrigger);

export default function HomePage() {
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Small delay to ensure DOM is fully painted
    const timer = setTimeout(() => {
      // Scroll-triggered reveal for sections with .reveal-section class
      const sections = document.querySelectorAll('.reveal-section');
      sections.forEach((section) => {
        gsap.fromTo(
          section,
          { y: 50, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 88%',
              toggleActions: 'play none none none',
            },
          },
        );
      });

      // Parallax for images with .parallax-img class
      document.querySelectorAll('.parallax-img').forEach((img) => {
        gsap.to(img, {
          yPercent: 12,
          ease: 'none',
          scrollTrigger: {
            trigger: img.parentElement,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.2,
          },
        });
      });

      return () => {
        ScrollTrigger.getAll().forEach((t) => t.kill());
        clearTimeout(timer);
      };
    }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <MouseFollower />
      <Navbar />

      <main ref={mainRef} className="flex-1">
        <section className="reveal-section">
          <HeroSection />
        </section>
        <section className="reveal-section">
          <FeaturedCollections />
        </section>
        <section className="reveal-section">
          <NewArrivals />
        </section>
        <section className="reveal-section">
          <BestSellers />
        </section>
        <section className="reveal-section">
          <TrendingProducts />
        </section>
        <section className="reveal-section">
          <LuxuryCategories />
        </section>
        <section className="reveal-section">
          <DesignerCollections />
        </section>
        <section className="reveal-section">
          <VideoCampaign />
        </section>
        <section className="reveal-section">
          <BrandStory />
        </section>
        <section className="reveal-section">
          <EditorialSection />
        </section>
        <section className="reveal-section">
          <Testimonials />
        </section>
        <section className="reveal-section">
          <SocialProof />
        </section>
        <section className="reveal-section">
          <NewsletterSection />
        </section>
        <section className="reveal-section">
          <InstagramGallery />
        </section>
      </main>

      <Footer />

      <CartSidebar />
      <SearchOverlay />
      <QuickViewModal />
    </div>
  );
}
