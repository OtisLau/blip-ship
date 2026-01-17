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
    <section id="testimonials" style={{ padding: '80px 0', backgroundColor: 'white' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 600, color: '#111', marginBottom: '12px', letterSpacing: '-0.5px' }}>
            {config.sectionTitle}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            {[...Array(5)].map((_, i) => (
              <svg key={i} style={{ width: '18px', height: '18px', color: '#111' }} fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            ))}
            <span style={{ marginLeft: '8px', fontSize: '14px', color: '#6b7280' }}>4.9 from 2,400+ reviews</span>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
        }}>
          {config.items.map((testimonial, index) => (
            <div
              key={index}
              style={{
                backgroundColor: '#fafafa',
                padding: '28px',
                border: '1px solid #e5e7eb',
              }}
            >
              <div style={{ display: 'flex', gap: '2px', marginBottom: '16px' }}>
                {[...Array(5)].map((_, i) => (
                  <svg key={i} style={{ width: '14px', height: '14px', color: '#111' }} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
              <p style={{ color: '#374151', marginBottom: '20px', lineHeight: 1.6, fontSize: '15px' }}>
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#111',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 500,
                  fontSize: '16px',
                }}>
                  {testimonial.author.charAt(0)}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#111' }}>{testimonial.author}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280' }}>Verified Buyer</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
