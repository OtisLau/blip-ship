'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';

export function Header() {
  const { totalItems, openCart } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header style={{
        backgroundColor: '#FFFFFF',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: '120px',
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 20px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '120px',
          }}>
            {/* Logo (Figma: text-5xl Volkhov) */}
            <div
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{ cursor: 'pointer' }}
            >
              <span style={{
                fontFamily: "'Volkhov', serif",
                fontSize: '48px',
                fontWeight: 400,
                color: '#3F3F46',
                lineHeight: '52px',
              }}>
                FASCO
              </span>
            </div>

            {/* Nav (Figma: text-base Poppins text-zinc-700) */}
            <nav style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
              {[
                { label: 'Home', section: 'hero' },
                { label: 'Deals', section: 'deals' },
                { label: 'New Arrivals', section: 'products' },
                { label: 'Packages', section: 'featured-collection' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => scrollToSection(item.section)}
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    color: '#3F3F46',
                    fontSize: '16px',
                    fontWeight: 400,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#000000'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#3F3F46'}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              {/* Sign in (Figma: text-base Poppins text-zinc-700) */}
              <button
                onClick={() => alert('Sign In coming soon!')}
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  color: '#3F3F46',
                  fontSize: '16px',
                  fontWeight: 400,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#000000'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#3F3F46'}
              >
                Sign in
              </button>

              {/* Sign Up Button (Figma: w-36 h-14 bg-black rounded-[10px]) */}
              <button
                onClick={() => alert('Sign Up coming soon!')}
                style={{
                  width: '144px',
                  height: '56px',
                  backgroundColor: '#000000',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '16px',
                  fontWeight: 400,
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
                Sign Up
              </button>

              {/* Cart Button - Hidden but functional */}
              <button
                onClick={openCart}
                style={{
                  color: '#3F3F46',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: '8px',
                  transition: 'opacity 0.2s ease',
                  display: 'none', // Hidden to match Figma but kept for functionality
                }}
              >
                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {totalItems > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    background: '#000000',
                    color: '#FFFFFF',
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '10px',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    borderRadius: '50%',
                  }}>
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {searchOpen && (
        <>
          <div
            onClick={() => setSearchOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 100,
            }}
          />
          <div style={{
            position: 'fixed',
            top: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            maxWidth: '90vw',
            backgroundColor: '#FFFFFF',
            padding: '24px',
            zIndex: 101,
            borderRadius: '10px',
            boxShadow: '0px 20px 60px rgba(0, 0, 0, 0.15)',
          }}>
            <div style={{ position: 'relative' }}>
              <svg
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  color: '#71717A',
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 44px',
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '16px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '10px',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ marginTop: '16px' }}>
              {searchQuery && (
                <div>
                  <p style={{
                    fontFamily: "'Poppins', sans-serif",
                    color: '#71717A',
                    fontSize: '14px',
                    marginBottom: '16px'
                  }}>
                    Results for &quot;{searchQuery}&quot;
                  </p>
                  <button
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    style={{
                      padding: '16px',
                      backgroundColor: '#FAFAFA',
                      border: '1px solid #E5E7EB',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                    }}
                  >
                    <svg style={{ width: '18px', height: '18px', color: '#71717A' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    View all products matching &quot;{searchQuery}&quot;
                  </button>
                </div>
              )}
              {!searchQuery && (
                <div>
                  <p style={{
                    fontFamily: "'Poppins', sans-serif",
                    color: '#71717A',
                    fontSize: '12px',
                    marginBottom: '16px',
                    fontWeight: 600,
                  }}>
                    Popular
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['Blazer', 'Dress', 'Jacket', 'Accessories'].map((term) => (
                      <button
                        key={term}
                        onClick={() => setSearchQuery(term)}
                        style={{
                          padding: '8px 14px',
                          backgroundColor: '#FAFAFA',
                          border: '1px solid #E5E7EB',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontFamily: "'Poppins', sans-serif",
                          fontSize: '14px',
                          color: '#3F3F46',
                        }}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
