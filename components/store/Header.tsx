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
            height: '64px'
          }}>
            {/* Logo */}
            <div
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{ cursor: 'pointer' }}
            >
              <span style={{ fontSize: '20px', fontWeight: 600, color: '#111', letterSpacing: '2px', textTransform: 'uppercase' }}>
                Urban Threads
              </span>
            </div>

            {/* Nav - Men/Women buttons don't filter yet. Rage click 3x to trigger LLM fix! */}
            <nav style={{ display: 'flex', gap: '32px' }}>
              {['New Arrivals', 'Men', 'Women'].map((item) => (
                <button
                  key={item}
                  data-nav-item={item.toLowerCase().replace(' ', '-')}
                  onClick={() => scrollToSection('products')}
                  style={{
                    color: '#111',
                    fontSize: '13px',
                    fontWeight: 500,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.6'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  {item}
                </button>
              ))}
              <button
                onClick={() => scrollToSection('products')}
                style={{
                  color: '#dc2626',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Sale
              </button>
            </nav>

            {/* Right side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setSearchOpen(true)}
                style={{
                  color: '#111',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.6'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button
                style={{
                  color: '#111',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.6'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              <button
                onClick={openCart}
                style={{
                  color: '#111',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  padding: '8px',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.6'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {totalItems > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: '#111',
                    color: 'white',
                    fontSize: '10px',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
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
            backgroundColor: 'white',
            padding: '24px',
            zIndex: 101,
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ position: 'relative' }}>
              <svg
                style={{
                  position: 'absolute',
                  left: '12px',
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
                  padding: '14px 14px 14px 44px',
                  fontSize: '16px',
                  border: '1px solid #e5e7eb',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ marginTop: '16px' }}>
              {searchQuery && (
                <div>
                  <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '12px' }}>
                    Results for &quot;{searchQuery}&quot;
                  </p>
                  <button
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#fafafa',
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <svg style={{ width: '18px', height: '18px', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    View all products matching &quot;{searchQuery}&quot;
                  </button>
                </div>
              )}
              {!searchQuery && (
                <div>
                  <p style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Popular</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['Hoodie', 'T-Shirt', 'Joggers', 'Crewneck'].map((term) => (
                      <button
                        key={term}
                        onClick={() => setSearchQuery(term)}
                        style={{
                          padding: '8px 14px',
                          backgroundColor: '#fafafa',
                          border: '1px solid #e5e7eb',
                          cursor: 'pointer',
                          fontSize: '13px',
                          color: '#374151',
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
