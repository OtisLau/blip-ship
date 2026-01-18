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
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '72px'
          }}>
            {/* Logo */}
            <div
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#0a0a0a',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                fontFamily: 'system-ui, -apple-system, sans-serif'
              }}>
                VOID
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 500,
                color: '#6b7280',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginTop: '2px'
              }}>
                Studios
              </span>
            </div>

            {/* Spacer for centered layout */}
            <div></div>

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => setSearchOpen(true)}
                style={{
                  color: '#0a0a0a',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '10px',
                  transition: 'opacity 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.5'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button
                onClick={openCart}
                style={{
                  color: '#0a0a0a',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: '10px',
                  transition: 'opacity 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.5'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {totalItems > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    background: '#0a0a0a',
                    color: 'white',
                    fontSize: '9px',
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
              backgroundColor: 'rgba(0,0,0,0.6)',
              zIndex: 100,
              backdropFilter: 'blur(4px)',
            }}
          />
          <div style={{
            position: 'fixed',
            top: '120px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '560px',
            maxWidth: '90vw',
            backgroundColor: 'white',
            padding: '28px',
            zIndex: 101,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
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
                  color: '#9ca3af',
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
                  padding: '16px 16px 16px 52px',
                  fontSize: '15px',
                  border: '2px solid #e5e7eb',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#0a0a0a'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              />
            </div>
            <div style={{ marginTop: '20px' }}>
              {searchQuery && (
                <div>
                  <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Results for &quot;{searchQuery}&quot;
                  </p>
                  <button
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    style={{
                      padding: '14px 18px',
                      backgroundColor: '#fafafa',
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                  >
                    <svg style={{ width: '18px', height: '18px', color: '#6b7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    View all products matching &quot;{searchQuery}&quot;
                  </button>
                </div>
              )}
              {!searchQuery && (
                <div>
                  <p style={{ color: '#9ca3af', fontSize: '10px', marginBottom: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Popular Searches</p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {['Hoodie', 'Tee', 'Sweatpants', 'Crewneck'].map((term) => (
                      <button
                        key={term}
                        onClick={() => setSearchQuery(term)}
                        style={{
                          padding: '10px 16px',
                          backgroundColor: '#fafafa',
                          border: '1px solid #e5e7eb',
                          cursor: 'pointer',
                          fontSize: '13px',
                          color: '#374151',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#0a0a0a';
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.borderColor = '#0a0a0a';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#fafafa';
                          e.currentTarget.style.color = '#374151';
                          e.currentTarget.style.borderColor = '#e5e7eb';
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
