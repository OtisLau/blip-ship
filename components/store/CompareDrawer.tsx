'use client';

import Image from 'next/image';
import { useCompare } from '@/context/CompareContext';

/**
 * CompareDrawer Component
 *
 * Side-by-side product comparison drawer.
 * Follows theme-protection-guardrails.md:
 * - White background
 * - #e5e7eb borders
 * - #111 header background
 * - No border-radius (sharp corners)
 */
export function CompareDrawer() {
  const {
    compareItems,
    removeFromCompare,
    clearCompare,
    isOpen,
    closeDrawer,
  } = useCompare();

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={closeDrawer}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(17, 17, 17, 0.5)',
          zIndex: 90,
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '800px',
          backgroundColor: 'white',
          zIndex: 91,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            backgroundColor: '#111',
            color: 'white',
          }}
        >
          <h2
            style={{
              fontSize: '14px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: 0,
            }}
          >
            Compare Products ({compareItems.length})
          </h2>
          <div style={{ display: 'flex', gap: '16px' }}>
            {compareItems.length > 0 && (
              <button
                onClick={clearCompare}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#6b7280',
                  fontSize: '12px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                }}
              >
                Clear All
              </button>
            )}
            <button
              onClick={closeDrawer}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: 0,
              }}
              aria-label="Close compare drawer"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px',
          }}
        >
          {compareItems.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                color: '#6b7280',
              }}
            >
              <p style={{ fontSize: '14px', fontWeight: 500 }}>
                No products to compare
              </p>
              <p style={{ fontSize: '12px', marginTop: '8px' }}>
                Add products from the grid to compare them side by side
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(compareItems.length, 4)}, 1fr)`,
                gap: '16px',
              }}
            >
              {compareItems.map((product) => (
                <div
                  key={product.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    backgroundColor: 'white',
                  }}
                >
                  {/* Remove Button */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      padding: '8px',
                    }}
                  >
                    <button
                      onClick={() => removeFromCompare(product.id)}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                      aria-label={`Remove ${product.name} from comparison`}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Product Image */}
                  <div
                    style={{
                      aspectRatio: '1',
                      position: 'relative',
                      backgroundColor: '#f5f5f5',
                    }}
                  >
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                    {product.badge && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          backgroundColor: '#111',
                          color: 'white',
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '4px 8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {product.badge}
                      </span>
                    )}
                  </div>

                  {/* Product Info */}
                  <div style={{ padding: '16px' }}>
                    <h3
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#111',
                        marginBottom: '4px',
                      }}
                    >
                      {product.name}
                    </h3>
                    <p
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#111',
                        marginBottom: '12px',
                      }}
                    >
                      ${product.price.toFixed(2)}
                    </p>

                    {product.description && (
                      <div style={{ marginBottom: '12px' }}>
                        <p
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#111',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '4px',
                          }}
                        >
                          Description
                        </p>
                        <p
                          style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            lineHeight: 1.5,
                          }}
                        >
                          {product.description}
                        </p>
                      </div>
                    )}

                    {product.materials && (
                      <div>
                        <p
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#111',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '4px',
                          }}
                        >
                          Materials
                        </p>
                        <p
                          style={{
                            fontSize: '12px',
                            color: '#6b7280',
                          }}
                        >
                          {product.materials}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with CTA */}
        {compareItems.length > 0 && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
            }}
          >
            <button
              onClick={closeDrawer}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#111',
                color: 'white',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                cursor: 'pointer',
              }}
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Floating Compare Button
 *
 * Shows when 2+ products are selected for comparison.
 */
export function FloatingCompareButton() {
  const { compareItems, openDrawer } = useCompare();

  if (compareItems.length < 2) return null;

  return (
    <button
      onClick={openDrawer}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        backgroundColor: '#111',
        color: 'white',
        padding: '14px 24px',
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
      Compare ({compareItems.length})
    </button>
  );
}

export default CompareDrawer;
