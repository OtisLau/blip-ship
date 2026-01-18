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
          padding: 'var(--container-padding)',
        }}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: 'var(--color-bg-primary)',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            borderRadius: 'var(--radius-base)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 'var(--spacing-base)',
              right: 'var(--spacing-base)',
              background: 'var(--color-bg-primary)',
              border: 'none',
              cursor: 'pointer',
              padding: 'var(--spacing-sm)',
              borderRadius: 'var(--radius-full)',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg style={{ width: '20px', height: '20px', color: 'var(--color-text-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Product Image */}
          <div
            style={{
              aspectRatio: '1/1',
              maxHeight: '280px',
              backgroundColor: 'var(--color-bg-secondary)',
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
                objectFit: 'contain',
              }}
            />
            {product.badge && (
              <span
                style={{
                  position: 'absolute',
                  top: 'var(--spacing-base)',
                  left: 'var(--spacing-base)',
                  backgroundColor: product.badge.toLowerCase() === 'sale'
                    ? 'var(--color-accent-sale)'
                    : 'var(--color-accent-primary)',
                  color: 'var(--color-text-inverted)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {sanitizeText(product.badge)}
              </span>
            )}
          </div>

          {/* Product Info */}
          <div style={{ padding: 'var(--spacing-xl)', overflowY: 'auto' }}>
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--text-xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-black)',
                marginBottom: 'var(--spacing-sm)',
              }}
            >
              {sanitizeText(product.name)}
            </h2>

            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-black)',
                marginBottom: 'var(--spacing-base)',
              }}
            >
              ${product.price.toFixed(2)}
            </p>

            {product.description && (
              <div style={{ marginBottom: 'var(--spacing-base)' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                    marginBottom: 'var(--spacing-sm)',
                  }}
                >
                  Description
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-primary)',
                    lineHeight: 1.6,
                  }}
                >
                  {sanitizeText(product.description)}
                </p>
              </div>
            )}

            {product.materials && (
              <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                    marginBottom: 'var(--spacing-sm)',
                  }}
                >
                  Materials
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-primary)',
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
                backgroundColor: 'var(--color-accent-primary)',
                color: 'var(--color-text-inverted)',
                border: 'none',
                borderRadius: 'var(--radius-base)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                cursor: 'pointer',
                transition: 'opacity var(--transition-base)',
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
