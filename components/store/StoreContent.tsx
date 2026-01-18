'use client'

import dynamic from 'next/dynamic'
import { Header } from '@/components/store/Header'
import { Hero } from '@/components/store/Hero'
import { ProductGrid } from '@/components/store/ProductGrid'
import { Testimonials } from '@/components/store/Testimonials'
import { Footer } from '@/components/store/Footer'
import { CartProvider } from '@/context/CartContext'
import { SiteConfig } from '@/lib/types'

// Dynamic imports for heavy components (rule: bundle-dynamic-imports)
// EventTracker: ~50KB - loads after hydration, doesn't block initial paint
const EventTracker = dynamic(
  () => import('@/components/tracking/EventTracker').then(m => m.EventTracker),
  { ssr: false }
)

// CartDrawer: ~35KB - only needed when cart is opened
const CartDrawer = dynamic(
  () => import('@/components/store/CartDrawer').then(m => m.CartDrawer),
  { ssr: false }
)

interface StoreContentProps {
  config: SiteConfig
}

// Feature toggle button for dev testing
const FeatureToggleButton = dynamic(
  () =>
    import('@/components/ui/FeatureToggleButton').then(
      m => m.FeatureToggleButton
    ),
  { ssr: false }
)

export function StoreContent({ config }: StoreContentProps) {
  return (
    <EventTracker>
      <CartProvider>
        <main style={{ minHeight: '100vh', backgroundColor: 'white' }}>
          <Header />
          <section data-section="hero">
            <Hero config={config.hero} />
          </section>
          <section data-section="products">
            <ProductGrid config={config.products} />
          </section>
          <section data-section="testimonials">
            <Testimonials config={config.testimonials} />
          </section>
          <section data-section="footer">
            <Footer config={config.footer} />
          </section>
          <CartDrawer />
        </main>
      </CartProvider>
    </EventTracker>
  )
}
