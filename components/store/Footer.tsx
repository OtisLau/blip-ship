'use client';

import { useState } from 'react';
import { SiteConfig } from '@/lib/types';

interface FooterProps {
  config: SiteConfig['footer'];
}

export function Footer({ config }: FooterProps) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer id="footer" style={{ backgroundColor: config.backgroundColor }}>
      {/* Newsletter Section */}
      {config.showNewsletter && (
        <div style={{ borderBottom: '1px solid #27272a' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' }}>
            <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
              {subscribed ? (
                <>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}>
                    <svg style={{ width: '20px', height: '20px', color: '#111' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 500, color: 'white', marginBottom: '4px' }}>
                    You&apos;re subscribed
                  </h3>
                  <p style={{ color: '#71717a', fontSize: '14px' }}>
                    Check your inbox for your 15% discount code.
                  </p>
                </>
              ) : (
                <>
                  <h3 style={{ fontSize: '18px', fontWeight: 500, color: 'white', marginBottom: '4px' }}>
                    {config.newsletterHeadline}
                  </h3>
                  <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '20px' }}>
                    Be the first to know about new drops and exclusive offers.
                  </p>
                  <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: '0', maxWidth: '360px', margin: '0 auto' }}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      style={{
                        flex: 1,
                        padding: '12px 14px',
                        backgroundColor: '#18181b',
                        border: '1px solid #27272a',
                        borderRight: 'none',
                        color: 'white',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '12px 20px',
                        backgroundColor: 'white',
                        color: '#111',
                        border: 'none',
                        fontWeight: 500,
                        fontSize: '13px',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      Subscribe
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Footer */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '32px',
        }}>
          {/* Shop */}
          <div>
            <h4 style={{ fontSize: '11px', fontWeight: 600, color: 'white', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Shop</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['New Arrivals', 'Best Sellers', 'Sale', 'All Products'].map((item) => (
                <li key={item}>
                  <button
                    onClick={() => scrollToSection('products')}
                    style={{ color: '#71717a', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#71717a'}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 style={{ fontSize: '11px', fontWeight: 600, color: 'white', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Help</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['FAQ', 'Shipping', 'Returns', 'Contact'].map((item) => (
                <li key={item}>
                  <button
                    onClick={() => alert(`${item} page coming soon!`)}
                    style={{ color: '#71717a', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#71717a'}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 style={{ fontSize: '11px', fontWeight: 600, color: 'white', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Company</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['About', 'Sustainability', 'Careers', 'Press'].map((item) => (
                <li key={item}>
                  <button
                    onClick={() => alert(`${item} page coming soon!`)}
                    style={{ color: '#71717a', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#71717a'}
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 style={{ fontSize: '11px', fontWeight: 600, color: 'white', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Follow Us</h4>
            <div style={{ display: 'flex', gap: '12px' }}>
              {[
                { name: 'Instagram', path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' },
                { name: 'Twitter', path: 'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z' },
                { name: 'YouTube', path: 'M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z' },
              ].map((social) => (
                <button
                  key={social.name}
                  onClick={() => alert(`Follow us on ${social.name}!`)}
                  style={{ color: '#71717a', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#71717a'}
                >
                  <svg style={{ width: '18px', height: '18px' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d={social.path} />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div style={{
          borderTop: '1px solid #27272a',
          marginTop: '40px',
          paddingTop: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <p style={{ color: '#52525b', fontSize: '13px' }}>
            &copy; 2024 Urban Threads. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '20px' }}>
            {['Privacy', 'Terms'].map((item) => (
              <button
                key={item}
                onClick={() => alert(`${item} page coming soon!`)}
                style={{ color: '#52525b', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#52525b'}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
