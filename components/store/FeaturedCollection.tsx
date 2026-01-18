'use client';

import { useState } from 'react';
import Image from 'next/image';
import { SiteConfig } from '@/lib/types';
import { sanitizeText, sanitizeUrl } from '@/lib/sanitize';

interface FeaturedCollectionProps {
  config: NonNullable<SiteConfig['featuredCollection']>;
}

export function FeaturedCollection({ config }: FeaturedCollectionProps) {
  const [activeImage, setActiveImage] = useState(0);

  return (
    <section id="featured-collection" style={{
      padding: 'var(--spacing-6xl) 0',
      backgroundColor: 'var(--color-bg-secondary)',
    }}>
      <div style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        padding: '0 var(--container-padding)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--spacing-4xl)',
          alignItems: 'center',
        }}>
          {/* Left Side - Image Gallery */}
          <div style={{
            position: 'relative',
          }}>
            {/* Main Image */}
            <div style={{
              position: 'relative',
              aspectRatio: '4/5',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              backgroundColor: 'var(--color-bg-primary)',
            }}>
              <Image
                src={sanitizeUrl(config.images[activeImage])}
                alt={sanitizeText(config.title)}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{
                  objectFit: 'cover',
                }}
              />
            </div>

            {/* Thumbnail Navigation */}
            <div style={{
              display: 'flex',
              gap: 'var(--spacing-md)',
              marginTop: 'var(--spacing-lg)',
            }}>
              {config.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImage(index)}
                  style={{
                    width: '80px',
                    height: '80px',
                    position: 'relative',
                    borderRadius: 'var(--radius-base)',
                    overflow: 'hidden',
                    border: index === activeImage
                      ? '2px solid var(--color-accent-primary)'
                      : '2px solid transparent',
                    cursor: 'pointer',
                    opacity: index === activeImage ? 1 : 0.6,
                    transition: 'all var(--transition-base)',
                  }}
                >
                  <Image
                    src={sanitizeUrl(image)}
                    alt={`${sanitizeText(config.title)} view ${index + 1}`}
                    fill
                    sizes="80px"
                    style={{
                      objectFit: 'cover',
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Right Side - Content */}
          <div style={{
            paddingLeft: 'var(--spacing-2xl)',
          }}>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--spacing-sm)',
              letterSpacing: '2px',
            }}>
              {sanitizeText(config.subtitle)}
            </p>

            <h2 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-5xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-black)',
              marginBottom: 'var(--spacing-xl)',
              lineHeight: 1.1,
            }}>
              {sanitizeText(config.title)}
            </h2>

            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-base)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.7,
              marginBottom: 'var(--spacing-xl)',
              maxWidth: '450px',
            }}>
              {sanitizeText(config.description)}
            </p>

            {/* Category Tags */}
            <div style={{
              display: 'flex',
              gap: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-xl)',
            }}>
              {config.categories.map((category, index) => (
                <span
                  key={index}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--color-bg-primary)',
                    border: '1px solid var(--color-ui-border)',
                    borderRadius: 'var(--radius-base)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {category}
                </span>
              ))}
            </div>

            {/* Price */}
            <p style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-black)',
              marginBottom: 'var(--spacing-xl)',
            }}>
              ${config.price.toFixed(2)}
            </p>

            {/* CTA Button */}
            <button
              onClick={() => alert('Collection coming soon!')}
              style={{
                padding: '16px 40px',
                backgroundColor: 'var(--color-accent-primary)',
                color: 'var(--color-text-inverted)',
                border: 'none',
                borderRadius: 'var(--radius-base)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-base)',
                fontWeight: 'var(--font-weight-semibold)',
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
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
              {sanitizeText(config.cta.text)}
              <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
