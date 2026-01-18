'use client';

import { useState } from 'react';
import Image from 'next/image';
import { SiteConfig } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import { sanitizeText, sanitizeUrl } from '@/lib/sanitize';
import { ProductModal } from './ProductModal';

interface ProductGridProps {
  config: SiteConfig['products'];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: 'flex', gap: '0px' }}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          style={{
            width: '20px',
            height: '20px',
            backgroundColor: i < rating ? '#F59E0B' : '#E5E7EB',
          }}
        />
      ))}
    </div>
  );
}

export function ProductGrid({ config }: ProductGridProps) {
  const { addItem } = useCart();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<typeof config.items[0] | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = config.categories || ['All'];

  const filteredProducts = activeCategory === 'All'
    ? config.items
    : config.items.filter(item => item.category === activeCategory);


  const handleAddToCart = (product: typeof config.items[0]) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    });
  };

  return (
    <section id="products" style={{
      padding: '96px 0',
      backgroundColor: '#FFFFFF'
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 20px'
      }}>
        {/* Section Header (Figma: text-5xl Volkhov) */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{
            fontFamily: "'Volkhov', serif",
            fontSize: '48px',
            fontWeight: 400,
            color: '#3F3F46',
            marginBottom: '16px',
          }}>
            {sanitizeText(config.sectionTitle)}
          </h2>
          {config.subtitle && (
            <p style={{
              fontFamily: "'Poppins', sans-serif",
              color: '#71717A',
              fontSize: '16px',
              lineHeight: '24px',
              maxWidth: '614px',
              margin: '0 auto',
            }}>
              {sanitizeText(config.subtitle)}
            </p>
          )}

          {/* Category Tabs (Figma: w-52 h-14 rounded-[10px]) */}
          {categories.length > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              marginTop: '32px',
            }}>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  style={{
                    width: '208px',
                    height: '56px',
                    backgroundColor: activeCategory === category
                      ? '#000000'
                      : '#FAFAFA',
                    color: activeCategory === category
                      ? '#FFFFFF'
                      : '#71717A',
                    border: 'none',
                    borderRadius: '10px',
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '16px',
                    fontWeight: 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0px 20px 35px rgba(0, 0, 0, 0.15)',
                  }}
                  onMouseEnter={(e) => {
                    if (activeCategory !== category) {
                      e.currentTarget.style.backgroundColor = '#F5F5F5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeCategory !== category) {
                      e.currentTarget.style.backgroundColor = '#FAFAFA';
                    }
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Grid (Figma: 3 columns, w-96 h-96 cards) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 384px)',
          gap: '24px',
          justifyContent: 'center',
          marginTop: '32px',
        }}>
          {filteredProducts.slice(0, 6).map((product) => (
            <div
              key={product.id}
              data-product-id={product.id}
              style={{
                width: '384px',
                height: '384px',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                boxShadow: '0px 40px 90px rgba(0, 0, 0, 0.06)',
                overflow: 'hidden',
                transition: 'transform 0.2s ease',
                transform: hoveredId === product.id ? 'translateY(-4px)' : 'translateY(0)',
              }}
              onMouseEnter={() => setHoveredId(product.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Product Image (Figma: w-80 h-60 rounded-[10px]) */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProduct(product);
                }}
                style={{
                  width: '336px',
                  height: '244px',
                  margin: '24px auto 0',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '10px',
                  cursor: 'pointer',
                }}
              >
                <Image
                  src={sanitizeUrl(product.image)}
                  alt={sanitizeText(product.name)}
                  fill
                  sizes="336px"
                  style={{
                    objectFit: 'cover',
                    transition: 'transform 0.3s ease',
                    transform: hoveredId === product.id ? 'scale(1.05)' : 'scale(1)',
                  }}
                />

                {product.badge && (
                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    backgroundColor: product.badge.toLowerCase() === 'sale' ? '#EF4444' : '#000000',
                    color: '#FFFFFF',
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '12px',
                    fontWeight: 400,
                    padding: '4px 12px',
                    borderRadius: '10px',
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
                    backgroundColor: '#000000',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    opacity: hoveredId === product.id ? 1 : 0,
                    transform: hoveredId === product.id ? 'translateY(0)' : 'translateY(8px)',
                    transition: 'all 0.2s ease',
                    boxShadow: '0px 20px 35px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  Add to Cart
                </button>
              </div>

              <div style={{ padding: '12px 24px' }}>
                {/* Product Name & Stars Row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}>
                  <h3 style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '20px',
                    fontWeight: 500,
                    color: '#3F3F46',
                    margin: 0,
                  }}>
                    {sanitizeText(product.name)}
                  </h3>
                  {/* Star Rating (Figma: 5 amber-500 squares) */}
                  {product.rating && <StarRating rating={product.rating} />}
                </div>

                {/* Brand */}
                <p style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#71717A',
                  lineHeight: '12px',
                  margin: '0 0 4px 0',
                }}>
                  Al Karam
                </p>

                {/* Reviews */}
                <p style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#3F3F46',
                  margin: '0 0 8px 0',
                }}>
                  (4.1k) Customer Reviews
                </p>

                {/* Price & Stock Row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <p style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '24px',
                    fontWeight: 500,
                    color: '#3F3F46',
                    lineHeight: '20px',
                    margin: 0,
                  }}>
                    ${product.price.toFixed(2)} CAD
                  </p>
                  {product.badge?.toLowerCase().includes('sale') && (
                    <p style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: '12px',
                      fontWeight: 400,
                      color: '#EF4444',
                      lineHeight: '20px',
                      margin: 0,
                    }}>
                      Almost Sold Out
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View More Button (Figma: w-52 h-14 bg-black rounded-[10px]) */}
        <div style={{ textAlign: 'center', marginTop: '64px' }}>
          <button
            onClick={() => alert('More products coming soon!')}
            style={{
              width: '208px',
              height: '56px',
              backgroundColor: '#000000',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontFamily: "'Poppins', sans-serif",
              fontSize: '16px',
              fontWeight: 400,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0px 20px 35px rgba(0, 0, 0, 0.15)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            View More
          </button>
        </div>
      </div>

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />
    </section>
  );
}
