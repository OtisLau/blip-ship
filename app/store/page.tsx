import { Header } from '@/components/store/Header';
import { Hero } from '@/components/store/Hero';
import { ProductGrid } from '@/components/store/ProductGrid';
import { Testimonials } from '@/components/store/Testimonials';
import { Footer } from '@/components/store/Footer';
import { CartDrawer } from '@/components/store/CartDrawer';
import { CartProvider } from '@/context/CartContext';
import { EventTracker } from '@/components/tracking/EventTracker';
import { getConfig } from '@/lib/db';

export default async function Store({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  const mode = params.mode === 'preview' ? 'preview' : 'live';

  let config;
  try {
    config = await getConfig(mode);
  } catch {
    // Fallback to live if preview doesn't exist
    config = await getConfig('live');
  }

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
  );
}
