'use client';

import { SiteConfig } from '@/types';
import { sanitizeText, sanitizeUrl } from '@/lib/sanitize';

interface HeroProps {
  config: SiteConfig['hero'];
}

export function Hero({ config }: HeroProps) {
  const sizeStyles = {
    small: { padding: '12px 24px', fontSize: '13px' },
    medium: { padding: '14px 32px', fontSize: '14px' },
    large: { padding: '16px 40px', fontSize: '15px' },
  };

  const scrollToProducts = () => {
    const element = document.getElementById('products');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="hero"
      style={{
        backgroundColor: config.backgroundColor,
        minHeight: '560px',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Image */}
      {config.backgroundImage && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${sanitizeUrl(config.backgroundImage)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.35,
          }}
        />
      )}

      {/* Gradient Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.3) 100%)',
        }}
      />

      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 24px',
        width: '100%',
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{ maxWidth: '560px' }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 600,
            color: 'white',
            lineHeight: 1.1,
            marginBottom: '16px',
            letterSpacing: '-0.5px',
          }}>
            {sanitizeText(config.headline)}
          </h1>
          <p style={{
            fontSize: '18px',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.6,
            marginBottom: '32px',
          }}>
            {sanitizeText(config.subheadline)}
          </p>
          {config.cta.position === 'inside-hero' && (
            <button
              data-cta
              className="hero-cta"
              onClick={scrollToProducts}
              style={{
                ...sizeStyles[config.cta.size],
                backgroundColor: config.cta.color,
                color: config.cta.textColor,
                border: 'none',
                fontWeight: 500,
                letterSpacing: '0.5px',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                textTransform: 'uppercase',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {sanitizeText(config.cta.text)}
            </button>
          )}
        </div>
      </div>

      {config.cta.position === 'below-hero' && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          padding: '24px 0',
          zIndex: 10,
        }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
            <button
              data-cta
              className="hero-cta"
              onClick={scrollToProducts}
              style={{
                ...sizeStyles[config.cta.size],
                backgroundColor: config.cta.color,
                color: config.cta.textColor,
                border: 'none',
                fontWeight: 500,
                letterSpacing: '0.5px',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {sanitizeText(config.cta.text)}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
