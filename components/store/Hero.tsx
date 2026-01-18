'use client';

import { useState } from 'react';
import Image from 'next/image';
import { SiteConfig } from '@/lib/types';
import { sanitizeText, sanitizeUrl } from '@/lib/sanitize';

interface HeroProps {
  config: SiteConfig['hero'];
}

export function Hero({ config }: HeroProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const images = config.images || [];

  const scrollToProducts = () => {
    const element = document.getElementById('products');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // If no images array, fall back to single image layout
  if (images.length === 0) {
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
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.3) 100%)',
          }}
        />
        <div style={{
          maxWidth: 'var(--max-width)',
          margin: '0 auto',
          padding: '0 var(--container-padding)',
          width: '100%',
          position: 'relative',
          zIndex: 10,
        }}>
          <div style={{ maxWidth: '560px' }}>
            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'var(--text-5xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-inverted)',
              lineHeight: 1.1,
              marginBottom: 'var(--spacing-base)',
            }}>
              {sanitizeText(config.headline)}
            </h1>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-lg)',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.6,
              marginBottom: 'var(--spacing-2xl)',
            }}>
              {sanitizeText(config.subheadline)}
            </p>
            <button
              data-cta
              className="hero-cta"
              onClick={scrollToProducts}
              style={{
                padding: '14px 32px',
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
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              {sanitizeText(config.cta.text)}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // FASCO 3-column layout matching Figma design exactly
  return (
    <section
      id="hero"
      style={{
        backgroundColor: '#FFFFFF',
        padding: '60px 0',
        overflow: 'hidden',
      }}
    >
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 20px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '392px 426px 392px',
          gap: '24px',
          justifyContent: 'center',
          minHeight: '756px',
        }}>
          {/* Left Column - Tall gray card with model (Figma: w-96 h-[756px] bg-neutral-200) */}
          <div style={{
            backgroundColor: '#E5E5E5',
            borderRadius: '10px',
            overflow: 'hidden',
            position: 'relative',
            height: '756px',
            boxShadow: '0px 20px 52px rgba(68, 68, 68, 0.04)',
          }}>
            {images[0] && (
              <Image
                src={sanitizeUrl(images[0])}
                alt="Fashion model"
                fill
                sizes="392px"
                style={{
                  objectFit: 'cover',
                  objectPosition: 'center bottom',
                  filter: 'grayscale(100%)',
                }}
                priority
              />
            )}
          </div>

          {/* Center Column - Images + Text */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            {/* Top Image (Figma: w-96 h-36 bg-neutral-200) */}
            <div style={{
              width: '100%',
              height: '144px',
              position: 'relative',
              borderRadius: '10px',
              overflow: 'hidden',
              backgroundColor: '#E5E5E5',
              boxShadow: '0px 20px 52px rgba(68, 68, 68, 0.04)',
            }}>
              {images[1] && (
                <Image
                  src={sanitizeUrl(images[1])}
                  alt="Fashion models"
                  fill
                  sizes="426px"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'center top',
                  }}
                  priority
                />
              )}
            </div>

            {/* Text Content */}
            <div style={{
              textAlign: 'center',
              padding: '40px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              justifyContent: 'center',
            }}>
              {/* ULTIMATE - Filled text (Figma: text-8xl font-medium text-zinc-700) */}
              <h1 style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: '96px',
                fontWeight: 500,
                color: '#3F3F46',
                lineHeight: '91px',
                letterSpacing: '0',
                margin: 0,
              }}>
                {sanitizeText(config.headline)}
              </h1>

              {/* SALE - Outlined text (Figma: text-[187px] font-medium) */}
              <p style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: '187px',
                fontWeight: 500,
                color: 'transparent',
                lineHeight: '187px',
                WebkitTextStroke: '2px #000000',
                margin: 0,
              }}>
                {sanitizeText(config.subheadline)}
              </p>

              {/* NEW COLLECTION (Figma: text-xl uppercase tracking-widest) */}
              <p style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: '20px',
                fontWeight: 400,
                color: '#3F3F46',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginTop: '16px',
                marginBottom: '24px',
              }}>
                NEW COLLECTION
              </p>

              {/* CTA Button (Figma: w-52 h-14 bg-black rounded-[10px]) */}
              <button
                data-cta
                className="hero-cta"
                onClick={scrollToProducts}
                style={{
                  width: '208px',
                  height: '56px',
                  backgroundColor: '#000000',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '16px',
                  fontWeight: 500,
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
                {sanitizeText(config.cta.text).toUpperCase()}
              </button>
            </div>

            {/* Bottom Image (Figma: w-96 h-36) */}
            <div style={{
              width: '100%',
              height: '144px',
              position: 'relative',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0px 20px 52px rgba(68, 68, 68, 0.04)',
            }}>
              {images[2] && (
                <Image
                  src={sanitizeUrl(images[2])}
                  alt="Fashion models"
                  fill
                  sizes="426px"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'center top',
                  }}
                  priority
                />
              )}
            </div>
          </div>

          {/* Right Column - Tall gray card with model (Figma: w-96 h-[756px] bg-neutral-200) */}
          <div style={{
            backgroundColor: '#E5E5E5',
            borderRadius: '10px',
            overflow: 'hidden',
            position: 'relative',
            height: '756px',
            boxShadow: '0px 20px 52px rgba(68, 68, 68, 0.04)',
          }}>
            {images[3] ? (
              <Image
                src={sanitizeUrl(images[3])}
                alt="Fashion model"
                fill
                sizes="392px"
                style={{
                  objectFit: 'cover',
                  objectPosition: 'center',
                  filter: 'grayscale(100%)',
                }}
                priority
              />
            ) : images[0] && (
              <Image
                src={sanitizeUrl(images[0])}
                alt="Fashion model"
                fill
                sizes="392px"
                style={{
                  objectFit: 'cover',
                  objectPosition: 'center',
                  filter: 'grayscale(100%)',
                }}
                priority
              />
            )}
          </div>
        </div>

        {/* Carousel Dots (Figma: inline-flex items-center gap-5) */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '20px',
          marginTop: '48px',
        }}>
          {/* Large circle indicator */}
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: '1px solid #000000',
            opacity: 0.7,
          }} />
          {[0, 1, 2, 3].map((index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: index === currentSlide ? '#000000' : '#A1A1AA',
                border: index === currentSlide ? '1px solid #000000' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                padding: 0,
              }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
