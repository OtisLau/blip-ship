'use client';

import { useState } from 'react';
import Image from 'next/image';
import { SiteConfig } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import { useCompare } from '@/context/CompareContext';
import { sanitizeText, sanitizeUrl } from '@/lib/sanitize';
import { ProductModal } from './ProductModal';
import { CompareDrawer } from './CompareDrawer';

interface ProductGridProps {
  config: SiteConfig['products'];
}

export function ProductGrid({ config }: ProductGridProps) {
  const { addItem } = useCart();
  const { isInCompare, toggleCompare, compareItems } = useCompare();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<typeof config.items[0] | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [compareDrawerOpen, setCompareDrawerOpen] = useState(false);

  const gridColumns = {
    'grid-2': 2,
    'grid-3': 3,
    'grid-4': 4,
  };

  const columns = gridColumns[config.layout];

  const handleAddToCart = async (product: typeof config.items[0]) => {
    setAddingId(product.id);
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    });
    setTimeout(() => setAddingId(null), 500);
  };

  return (
    <section id="products" style={{ padding: '80px 0', backgroundColor: '#fafafa' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 600, color: '#111', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            {sanitizeText(config.sectionTitle)}
          </h2>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>Curated essentials for your wardrobe</p>
          {compareItems.length > 0 && (
            <button
              onClick={() => setCompareDrawerOpen(true)}
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                backgroundColor: '#111',
                color: 'white',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Compare Selected
            </button>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: '20px',
        }}>
          {config.items.map((product) => (
            <div
              key={product.id}
              data-product-id={product.id}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setSelectedProduct(product);
                }
              }}
              style={{
                backgroundColor: 'white',
                overflow: 'hidden',
                border: '1px solid #e5e7eb',
                transition: 'border-color 0.2s',
                borderColor: hoveredId === product.id ? '#111' : '#e5e7eb',
              }}
              onMouseEnter={() => setHoveredId(product.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Product Image - clickable to open modal */}
              <div
                style={{
                  aspectRatio: '1',
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
                    objectFit: 'cover',
                    transition: 'transform 0.4s ease',
                    transform: hoveredId === product.id ? 'scale(1.05)' : 'scale(1)',
                  }}
                />

                {product.badge && (
                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    backgroundColor: '#111',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '6px 10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    {sanitizeText(product.badge)}
                  </span>
                )}

                <button
                  data-add-to-cart
                  data-cta
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(product);
                  }}
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    right: '12px',
                    padding: '12px',
                    backgroundColor: addingId === product.id ? '#22c55e' : '#111',
                    color: 'white',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: addingId === product.id ? 'wait' : 'pointer',
                    opacity: hoveredId === product.id ? 1 : 0,
                    transform: hoveredId === product.id ? 'translateY(0)' : 'translateY(8px)',
                    transition: 'all 0.2s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {addingId === product.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid transparent',
                        borderTop: '2px solid white',
                        animation: 'spin 1s linear infinite',
                      }} />
                      Adding...
                    </div>
                  ) : 'Add to Cart'}
                </button>
              </div>

              <div style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#111', marginBottom: '4px' }}>
                  {sanitizeText(product.name)}
                </h3>
                <p 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProduct(product);
                  }}
                  style={{ fontSize: '14px', color: '#6b7280', cursor: 'pointer' }}
                >
                  ${product.price.toFixed(2)}
                </p>
                <label
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#6b7280',
                    cursor: 'pointer',
                    marginTop: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isInCompare(product.id)}
                    onChange={() => toggleCompare(product)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  Compare
                </label>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <button
            onClick={() => alert('More products coming soon!')}
            style={{
              padding: '14px 28px',
              backgroundColor: 'transparent',
              border: '1px solid #111',
              fontSize: '12px',
              fontWeight: 600,
              color: '#111',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#111';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#111';
            }}
          >
            View All Products
            <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
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
    </section>
  );
}
