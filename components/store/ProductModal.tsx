'use client';

import { useEffect } from 'react';
import { sanitizeText, sanitizeUrl } from '@/lib/sanitize';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  badge?: string;
  description?: string;
  materials?: string;
}

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

export function ProductModal({ product, onClose, onAddToCart }: ProductModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (product) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [product, onClose]);

  if (!product) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleBackdropClick}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: 'white',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'white',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Product Image */}
          <div
            style={{
              aspectRatio: '4/3',
              backgroundColor: '#f5f5f5',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sanitizeUrl(product.image)}
              alt={sanitizeText(product.name)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            {product.badge && (
              <span
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  backgroundColor: '#111',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '6px 10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {sanitizeText(product.badge)}
              </span>
            )}
          </div>

          {/* Product Info */}
          <div style={{ padding: '24px', overflowY: 'auto' }}>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#111',
                marginBottom: '8px',
              }}
            >
              {sanitizeText(product.name)}
            </h2>

            <p
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#111',
                marginBottom: '16px',
              }}
            >
              ${product.price.toFixed(2)}
            </p>

            {product.description && (
              <div style={{ marginBottom: '16px' }}>
                <h3
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '8px',
                  }}
                >
                  Description
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    color: '#374151',
                    lineHeight: 1.6,
                  }}
                >
                  {sanitizeText(product.description)}
                </p>
              </div>
            )}

            {product.materials && (
              <div style={{ marginBottom: '24px' }}>
                <h3
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '8px',
                  }}
                >
                  Materials
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    color: '#374151',
                    lineHeight: 1.6,
                  }}
                >
                  {sanitizeText(product.materials)}
                </p>
              </div>
            )}

            {/* Add to Cart Button */}
            <button
              onClick={() => {
                onAddToCart(product);
                onClose();
              }}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#111',
                color: 'white',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
