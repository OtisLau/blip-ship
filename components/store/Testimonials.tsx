'use client';

import { useState } from 'react';
import Image from 'next/image';
import { SiteConfig } from '@/lib/types';
import { sanitizeText, sanitizeUrl } from '@/lib/sanitize';

interface TestimonialsProps {
  config: SiteConfig['testimonials'];
}

function StarRating({ size = 20 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', gap: '0px' }}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: '#F59E0B',
          }}
        />
      ))}
    </div>
  );
}

export function Testimonials({ config }: TestimonialsProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!config.show) {
    return null;
  }

  const goToPrev = () => {
    setActiveIndex((prev) => (prev === 0 ? config.items.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev === config.items.length - 1 ? 0 : prev + 1));
  };

  // Get displayed items (3 at a time with center being active)
  const getDisplayItems = () => {
    const items = config.items;
    const len = items.length;
    if (len < 3) return items;

    const prev = activeIndex === 0 ? len - 1 : activeIndex - 1;
    const next = activeIndex === len - 1 ? 0 : activeIndex + 1;
    return [items[prev], items[activeIndex], items[next]];
  };

  const displayItems = getDisplayItems();

  return (
    <section id="testimonials" style={{
      padding: '96px 0',
      backgroundColor: '#FAFAFA'
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 20px'
      }}>
        {/* Section Header (Figma: text-5xl Volkhov) */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
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
        </div>

        {/* Carousel Container */}
        <div style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '24px',
        }}>
          {/* Testimonial Cards */}
          {displayItems.map((testimonial, index) => {
            const isCenter = index === 1;
            const cardWidth = isCenter ? '864px' : '648px';
            const cardHeight = isCenter ? '384px' : '288px';
            const avatarSize = isCenter ? 242 : 182;

            return (
              <div
                key={index}
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  boxShadow: isCenter
                    ? '0px 20px 60px rgba(46, 33, 61, 0.08)'
                    : '0px 15px 45px rgba(46, 33, 61, 0.08)',
                  display: 'flex',
                  padding: isCenter ? '32px' : '24px',
                  gap: '24px',
                  transition: 'all 0.3s ease',
                  opacity: isCenter ? 1 : 0.8,
                  transform: isCenter ? 'scale(1)' : 'scale(0.95)',
                }}
              >
                {/* Avatar Section */}
                <div style={{ position: 'relative' }}>
                  {/* Gray background offset */}
                  <div style={{
                    position: 'absolute',
                    width: `${avatarSize}px`,
                    height: `${avatarSize}px`,
                    backgroundColor: '#D4D4D4',
                    left: '-16px',
                    top: '16px',
                  }} />
                  {/* Avatar Image */}
                  <div style={{
                    width: `${avatarSize}px`,
                    height: `${avatarSize}px`,
                    position: 'relative',
                    backgroundColor: '#E5E5E5',
                    overflow: 'hidden',
                  }}>
                    {testimonial.image ? (
                      <Image
                        src={sanitizeUrl(testimonial.image)}
                        alt={sanitizeText(testimonial.author)}
                        fill
                        sizes={`${avatarSize}px`}
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#A1A1AA',
                        color: '#FFFFFF',
                        fontSize: isCenter ? '64px' : '48px',
                        fontFamily: "'Volkhov', serif",
                      }}>
                        {testimonial.author.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Content Section */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}>
                  {/* Quote */}
                  <p style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: isCenter ? '16px' : '12px',
                    fontWeight: 400,
                    color: '#3F3F46',
                    lineHeight: 1.6,
                    marginBottom: '16px',
                  }}>
                    &ldquo;{sanitizeText(testimonial.quote)}&rdquo;
                  </p>

                  {/* Star Rating */}
                  <div style={{ marginBottom: '24px' }}>
                    <StarRating size={isCenter ? 20 : 14} />
                  </div>

                  {/* Divider */}
                  <div style={{
                    width: isCenter ? '224px' : '176px',
                    height: '1px',
                    backgroundColor: '#3F3F46',
                    marginBottom: '16px',
                  }} />

                  {/* Author */}
                  <p style={{
                    fontFamily: "'Volkhov', serif",
                    fontSize: isCenter ? '30px' : '24px',
                    fontWeight: 400,
                    color: '#3F3F46',
                    lineHeight: 1.2,
                    marginBottom: '8px',
                  }}>
                    {sanitizeText(testimonial.author)}
                  </p>

                  {/* Role */}
                  {testimonial.role && (
                    <p style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: isCenter ? '16px' : '12px',
                      fontWeight: 400,
                      color: '#3F3F46',
                    }}>
                      {sanitizeText(testimonial.role)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Arrows (Figma: w-12 h-12 bg-white rounded-full) */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          marginTop: '48px',
        }}>
          {/* Prev Arrow */}
          <button
            onClick={goToPrev}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0px 4px 14px 1px rgba(0, 0, 0, 0.16)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F5F5F5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
            aria-label="Previous testimonial"
          >
            <svg width="6" height="14" viewBox="0 0 6 14" fill="none">
              <path d="M5 1L1 7L5 13" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Next Arrow */}
          <button
            onClick={goToNext}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0px 4px 14px 1px rgba(0, 0, 0, 0.16)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F5F5F5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
            aria-label="Next testimonial"
          >
            <svg width="6" height="14" viewBox="0 0 6 14" fill="none">
              <path d="M1 1L5 7L1 13" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
