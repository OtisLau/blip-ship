'use client';

import { useCompare } from '@/context/CompareContext';
import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import { sanitizeText, sanitizeUrl } from '@/lib/sanitize';

interface CompareDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CompareDrawer({ isOpen, onClose }: CompareDrawerProps) {
  const { compareItems, removeFromCompare, clearCompare } = useCompare();
  const { addItem } = useCart();

  const handleAddToCart = (product: any) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
        }}
        onClick={onClose}
      />
      <div 
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '100%',
          maxWidth: '480px',
          height: '100vh',
          backgroundColor: 'white',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #e5e7eb',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111' }}>
            Compare Products ({compareItems.length})
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {compareItems.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280' }}>
              <p>No products to compare</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>Select products from the grid to compare them</p>
            </div>
          ) : (
            <div style={{ padding: '24px' }}>
              {/* Clear All Button */}
              {compareItems.length > 1 && (
                <button
                  onClick={clearCompare}
                  style={{
                    marginBottom: '24px',
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    border: '1px solid #e5e7eb',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#6b7280',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Clear All
                </button>
              )}

              {/* Product List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {compareItems.map((product) => (
                  <div key={product.id} style={{
                    display: 'flex',
                    gap: '16px',
                    padding: '16px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: 'white',
                  }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      position: 'relative',
                      backgroundColor: '#f5f5f5',
                      flexShrink: 0,
                    }}>
                      <Image
                        src={sanitizeUrl(product.image)}
                        alt={sanitizeText(product.name)}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#111', marginBottom: '4px' }}>
                        {sanitizeText(product.name)}
                      </h3>
                      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
                        ${product.price.toFixed(2)}
                      </p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleAddToCart(product)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#111',
                            color: 'white',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          Add to Cart
                        </button>
                        <button
                          onClick={() => removeFromCompare(product.id)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'transparent',
                            border: '1px solid #e5e7eb',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: '#6b7280',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}