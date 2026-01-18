'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { SiteConfig } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import { useCompare } from '@/context/CompareContext';
import { useFeatureToggle } from '@/context/FeatureToggleContext';
import { sanitizeText, sanitizeUrl } from '@/lib/sanitize';
import { ProductModal } from './ProductModal';
import { CompareDrawer } from './CompareDrawer';

interface ProductGridProps {
  config: SiteConfig['products'];
}

type Category = 'all' | 'hoodies' | 'tops' | 'sweatshirts' | 'bottoms' | 'outerwear' | 'accessories';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'tops', label: 'Tops' },
  { value: 'hoodies', label: 'Hoodies' },
  { value: 'sweatshirts', label: 'Sweatshirts' },
  { value: 'bottoms', label: 'Bottoms' },
  { value: 'outerwear', label: 'Outerwear' },
  { value: 'accessories', label: 'Accessories' },
];

export function ProductGrid({ config }: ProductGridProps) {
  const { addItem } = useCart();
  const { isInCompare, toggleCompare, compareItems } = useCompare();
  const { features } = useFeatureToggle();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<typeof config.items[0] | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [compareDrawerOpen, setCompareDrawerOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [showNotification, setShowNotification] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') return config.items;
    return config.items.filter((p) => (p as { category?: string }).category === activeCategory);
  }, [config.items, activeCategory]);

  const gridColumns = {
    'grid-2': 2,
    'grid-3': 3,
    'grid-4': 4,
  };

  const columns = gridColumns[config.layout];

  const handleAddToCart = async (product: typeof config.items[0]) => {
    if ((product as { soldOut?: boolean }).soldOut) return;

    setAddingId(product.id);
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    });

    // Show notification
    setShowNotification(product.name);
    setTimeout(() => setShowNotification(null), 2500);
    setTimeout(() => setAddingId(null), 500);
  };

  const handleCompareToggle = (product: typeof config.items[0]) => {
    const isCurrentlyInCompare = isInCompare(product.id);
    toggleCompare(product);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('track-event', {
        detail: {
          type: isCurrentlyInCompare ? 'comparison_remove' : 'comparison_add',
          productId: product.id,
          productName: product.name,
        }
      }));
    }
  };

  return (
    <section id="products" style={{ padding: '100px 0', backgroundColor: '#fafafa' }}>
      {/* Toast Notification */}
      <div
        style={{
          position: 'fixed',
          bottom: showNotification ? '32px' : '-100px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#0a0a0a',
          color: 'white',
          padding: '16px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 1000,
          transition: 'bottom 0.3s ease',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}
      >
        <svg style={{ width: '20px', height: '20px', color: '#22c55e' }} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        <span style={{ fontSize: '14px', fontWeight: 500 }}>
          {showNotification} added to bag
        </span>
      </div>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#6b7280',
            marginBottom: '12px',
            letterSpacing: '2px',
            textTransform: 'uppercase'
          }}>
            Collection
          </h2>
          <h3 style={{
            fontSize: '36px',
            fontWeight: 600,
            color: '#0a0a0a',
            marginBottom: '16px',
            letterSpacing: '-0.5px'
          }}>
            {sanitizeText(config.sectionTitle)}
          </h3>
          <p style={{ color: '#6b7280', fontSize: '16px', maxWidth: '480px', margin: '0 auto' }}>
            Thoughtfully designed essentials that prioritize quality, comfort, and longevity.
          </p>
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '48px',
          flexWrap: 'wrap',
        }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              style={{
                padding: '10px 20px',
                fontSize: '12px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                border: activeCategory === cat.value ? '2px solid #0a0a0a' : '2px solid #e5e7eb',
                backgroundColor: activeCategory === cat.value ? '#0a0a0a' : 'white',
                color: activeCategory === cat.value ? 'white' : '#374151',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (activeCategory !== cat.value) {
                  e.currentTarget.style.borderColor = '#0a0a0a';
                }
              }}
              onMouseLeave={(e) => {
                if (activeCategory !== cat.value) {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Compare button */}
        {features.compareFeature && compareItems.length > 0 && (
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <button
              onClick={() => {
                setCompareDrawerOpen(true);
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('track-event', {
                    detail: {
                      type: 'comparison_view',
                      elementText: `Comparing ${compareItems.length} products`,
                    }
                  }));
                }
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: '#0a0a0a',
                color: 'white',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Compare ({compareItems.length})
            </button>
          </div>
        )}

        {/* Product Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: '24px',
        }}>
          {filteredProducts.map((product) => {
            const isSoldOut = (product as { soldOut?: boolean }).soldOut;

            return (
              <div
                key={product.id}
                data-product-id={product.id}
                style={{
                  backgroundColor: 'white',
                  overflow: 'hidden',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.3s ease',
                  borderColor: hoveredId === product.id ? '#0a0a0a' : '#e5e7eb',
                  transform: hoveredId === product.id ? 'translateY(-4px)' : 'translateY(0)',
                  boxShadow: hoveredId === product.id ? '0 12px 24px rgba(0,0,0,0.08)' : 'none',
                }}
                onMouseEnter={() => setHoveredId(product.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Product Image - NOT CLICKABLE (creates dead click frustration) */}
                <div
                  style={{
                    aspectRatio: '4/5',
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundColor: '#f5f5f5',
                  }}
                >
                  <Image
                    src={sanitizeUrl(product.image)}
                    alt={sanitizeText(product.name)}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    style={{
                      objectFit: 'contain',
                      transition: 'transform 0.5s ease',
                      transform: hoveredId === product.id ? 'scale(1.05)' : 'scale(1)',
                      filter: isSoldOut ? 'grayscale(40%)' : 'none',
                    }}
                  />

                  {/* Badge */}
                  {product.badge && !isSoldOut && (
                    <span style={{
                      position: 'absolute',
                      top: '16px',
                      left: '16px',
                      backgroundColor: product.badge === 'New' ? '#0a0a0a' : '#0a0a0a',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '6px 12px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}>
                      {sanitizeText(product.badge)}
                    </span>
                  )}

                  {/* Sold Out Badge */}
                  {isSoldOut && (
                    <span style={{
                      position: 'absolute',
                      top: '16px',
                      left: '16px',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '6px 12px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}>
                      Sold Out
                    </span>
                  )}

                  {/* Add to Cart Button */}
                  {!isSoldOut && (
                    <button
                      data-add-to-cart
                      data-cta
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                      style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '16px',
                        right: '16px',
                        padding: '14px',
                        backgroundColor: addingId === product.id ? '#22c55e' : '#0a0a0a',
                        color: 'white',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: addingId === product.id ? 'wait' : 'pointer',
                        opacity: hoveredId === product.id ? 1 : 0,
                        transform: hoveredId === product.id ? 'translateY(0)' : 'translateY(8px)',
                        transition: 'all 0.25s ease',
                        textTransform: 'uppercase',
                        letterSpacing: '1.5px',
                      }}
                    >
                      {addingId === product.id ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <svg style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Adding...
                        </span>
                      ) : 'Add to Bag'}
                    </button>
                  )}

                  {/* Notify Me Button for Sold Out */}
                  {isSoldOut && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        alert('You\'ll be notified when this item is back in stock!');
                      }}
                      style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '16px',
                        right: '16px',
                        padding: '14px',
                        backgroundColor: 'white',
                        color: '#0a0a0a',
                        border: '2px solid #0a0a0a',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        opacity: hoveredId === product.id ? 1 : 0,
                        transform: hoveredId === product.id ? 'translateY(0)' : 'translateY(8px)',
                        transition: 'all 0.25s ease',
                        textTransform: 'uppercase',
                        letterSpacing: '1.5px',
                      }}
                    >
                      Notify Me
                    </button>
                  )}
                </div>

                {/* Product Info */}
                <div
                  style={{ padding: '20px', cursor: 'pointer' }}
                  onClick={() => setSelectedProduct(product)}
                >
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: isSoldOut ? '#9ca3af' : '#0a0a0a',
                    marginBottom: '6px',
                    letterSpacing: '0.3px'
                  }}>
                    {sanitizeText(product.name)}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    color: isSoldOut ? '#9ca3af' : '#6b7280',
                    fontWeight: 500
                  }}>
                    ${product.price}
                  </p>
                  {features.compareFeature && !isSoldOut && (
                    <label
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: '#6b7280',
                        cursor: 'pointer',
                        marginTop: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isInCompare(product.id)}
                        onChange={() => handleCompareToggle(product)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '16px',
                          height: '16px',
                          accentColor: '#0a0a0a',
                        }}
                      />
                      Compare
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ color: '#6b7280', fontSize: '16px' }}>No products found in this category.</p>
            <button
              onClick={() => setActiveCategory('all')}
              style={{
                marginTop: '16px',
                padding: '12px 24px',
                backgroundColor: '#0a0a0a',
                color: 'white',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              View All Products
            </button>
          </div>
        )}

        {/* View All */}
        <div style={{ textAlign: 'center', marginTop: '64px' }}>
          <button
            onClick={() => alert('More products coming soon!')}
            style={{
              padding: '16px 36px',
              backgroundColor: 'transparent',
              border: '2px solid #0a0a0a',
              fontSize: '12px',
              fontWeight: 600,
              color: '#0a0a0a',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.2s',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0a0a0a';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#0a0a0a';
            }}
          >
            View All Products
            <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>
      </div>

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />
      <CompareDrawer
        isOpen={compareDrawerOpen}
        onClose={() => setCompareDrawerOpen(false)}
      />

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}
