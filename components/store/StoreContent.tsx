'use client';

import dynamic from 'next/dynamic';
import { Header } from '@/components/store/Header';
import { Hero } from '@/components/store/Hero';
import { DealsSection } from '@/components/store/DealsSection';
import { ProductGrid } from '@/components/store/ProductGrid';
import { FeaturedCollection } from '@/components/store/FeaturedCollection';
import { TrustBadges } from '@/components/store/TrustBadges';
import { InstagramFeed } from '@/components/store/InstagramFeed';
import { Testimonials } from '@/components/store/Testimonials';
import { Footer } from '@/components/store/Footer';
import { CartProvider } from '@/context/CartContext';
import { SiteConfig } from '@/lib/types';

// Dynamic imports for heavy components (rule: bundle-dynamic-imports)
// EventTracker: ~50KB - loads after hydration, doesn't block initial paint
const EventTracker = dynamic(
  () => import('@/components/tracking/EventTracker').then((m) => m.EventTracker),
  { ssr: false }
);

// CartDrawer: ~35KB - only needed when cart is opened
const CartDrawer = dynamic(
  () => import('@/components/store/CartDrawer').then((m) => m.CartDrawer),
  { ssr: false }
);

interface StoreContentProps {
  config: SiteConfig;
}

export function StoreContent({ config }: StoreContentProps) {
  return (
    <EventTracker>
      <CartProvider>
        <main style={{ minHeight: '100vh', backgroundColor: 'white' }}>
          <Header />

          {/* Hero Section */}
          <section data-section="hero">
            <Hero config={config.hero} />
          </section>

          {/* Deals of the Month */}
          {config.deals && (
            <section data-section="deals">
              <DealsSection config={config.deals} />
            </section>
          )}

          {/* New Arrivals / Products */}
          <section data-section="products">
            <ProductGrid config={config.products} />
          </section>

          {/* Featured Collection (Peaky Blinders) */}
          {config.featuredCollection && (
            <section data-section="featured-collection">
              <FeaturedCollection config={config.featuredCollection} />
            </section>
          )}

          {/* Trust Badges */}
          {config.trustBadges && config.trustBadges.length > 0 && (
            <section data-section="trust-badges">
              <TrustBadges badges={config.trustBadges} />
            </section>
          )}

          {/* Instagram Feed */}
          {config.instagram && (
            <section data-section="instagram">
              <InstagramFeed config={config.instagram} />
            </section>
          )}

          {/* Testimonials */}
          <section data-section="testimonials">
            <Testimonials config={config.testimonials} />
          </section>

          {/* Footer */}
          <section data-section="footer">
            <Footer config={config.footer} />
          </section>

          <CartDrawer />
        </main>
      </CartProvider>
    </EventTracker>
  );
}
