'use client';

import { TrustBadge } from '@/lib/types';
import { sanitizeText } from '@/lib/sanitize';

interface TrustBadgesProps {
  badges: TrustBadge[];
}

function BadgeIcon({ icon }: { icon: TrustBadge['icon'] }) {
  const iconStyle = {
    width: '48px',
    height: '48px',
    color: 'var(--color-accent-primary)',
  };

  switch (icon) {
    case 'quality':
      return (
        <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case 'warranty':
      return (
        <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'shipping':
      return (
        <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      );
    case 'support':
      return (
        <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    default:
      return null;
  }
}

export function TrustBadges({ badges }: TrustBadgesProps) {
  if (!badges || badges.length === 0) return null;

  return (
    <section id="trust-badges" style={{
      padding: 'var(--spacing-5xl) 0',
      backgroundColor: 'var(--color-bg-primary)',
      borderTop: '1px solid var(--color-ui-border)',
      borderBottom: '1px solid var(--color-ui-border)',
    }}>
      <div style={{
        maxWidth: 'var(--max-width)',
        margin: '0 auto',
        padding: '0 var(--container-padding)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${badges.length}, 1fr)`,
          gap: 'var(--spacing-2xl)',
        }}>
          {badges.map((badge, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: 'var(--spacing-xl)',
              }}
            >
              <div style={{
                width: '80px',
                height: '80px',
                backgroundColor: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--spacing-lg)',
              }}>
                <BadgeIcon icon={badge.icon} />
              </div>
              <h3 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-black)',
                marginBottom: 'var(--spacing-xs)',
              }}>
                {sanitizeText(badge.title)}
              </h3>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
              }}>
                {sanitizeText(badge.description)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
