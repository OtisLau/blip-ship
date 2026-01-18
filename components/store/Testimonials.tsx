'use client';

import { SiteConfig } from '@/lib/types';

interface TestimonialsProps {
  config: SiteConfig['testimonials'];
}

export function Testimonials({ config }: TestimonialsProps) {
  if (!config.show) {
    return null;
  }

  return (
    <section id="testimonials" style={{ padding: '100px 0', backgroundColor: 'white' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h2 style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#6b7280',
            marginBottom: '12px',
            letterSpacing: '2px',
            textTransform: 'uppercase'
          }}>
            Reviews
          </h2>
          <h3 style={{
            fontSize: '36px',
            fontWeight: 600,
            color: '#0a0a0a',
            marginBottom: '16px',
            letterSpacing: '-0.5px'
          }}>
            {config.sectionTitle}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            {[...Array(5)].map((_, i) => (
              <svg key={i} style={{ width: '20px', height: '20px', color: '#0a0a0a' }} fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            ))}
            <span style={{ marginLeft: '10px', fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>4.9 from 2,400+ reviews</span>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '28px',
        }}>
          {config.items.map((testimonial, index) => (
            <div
              key={index}
              style={{
                backgroundColor: '#fafafa',
                padding: '32px',
                border: '1px solid #e5e7eb',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0a0a0a';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', gap: '3px', marginBottom: '20px' }}>
                {[...Array(5)].map((_, i) => (
                  <svg key={i} style={{ width: '14px', height: '14px', color: '#0a0a0a' }} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
              <p style={{
                color: '#374151',
                marginBottom: '24px',
                lineHeight: 1.7,
                fontSize: '15px',
                fontStyle: 'italic'
              }}>
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  backgroundColor: '#0a0a0a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '16px',
                  letterSpacing: '0.5px',
                }}>
                  {testimonial.author.charAt(0)}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#0a0a0a', letterSpacing: '0.3px' }}>
                    {testimonial.author}
                  </p>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>Verified Buyer</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
