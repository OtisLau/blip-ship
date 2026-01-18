'use client';

import { useState } from 'react';
import Image from 'next/image';
import { SiteConfig } from '@/lib/types';
import { sanitizeUrl } from '@/lib/sanitize';

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

  return (
    <footer id="footer" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Newsletter Section (Figma: text-5xl Volkhov + input + subscribe button) */}
      {config.showNewsletter && (
        <div style={{
          position: 'relative',
          padding: '96px 0',
          overflow: 'hidden',
        }}>
          {/* Background Model Images */}
          <div style={{
            position: 'absolute',
            left: '0',
            top: '0',
            width: '355px',
            height: '747px',
            opacity: 0.3,
          }}>
            {config.newsletterImage && (
              <Image
                src={sanitizeUrl(config.newsletterImage)}
                alt="Newsletter"
                fill
                sizes="355px"
                style={{
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                }}
              />
            )}
          </div>
          <div style={{
            position: 'absolute',
            right: '0',
            top: '0',
            width: '337px',
            height: '747px',
            opacity: 0.3,
          }}>
            {config.newsletterImage && (
              <Image
                src={sanitizeUrl(config.newsletterImage)}
                alt="Newsletter"
                fill
                sizes="337px"
                style={{
                  objectFit: 'cover',
                }}
              />
            )}
          </div>

          <div style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0 20px',
            position: 'relative',
            zIndex: 10,
          }}>
            <div style={{
              textAlign: 'center',
              maxWidth: '614px',
              margin: '0 auto',
            }}>
              {subscribed ? (
                <>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: '#000000',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                  }}>
                    <svg style={{ width: '28px', height: '28px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 style={{
                    fontFamily: "'Volkhov', serif",
                    fontSize: '48px',
                    fontWeight: 400,
                    color: '#3F3F46',
                    marginBottom: '16px',
                  }}>
                    You&apos;re In!
                  </h3>
                  <p style={{
                    fontFamily: "'Poppins', sans-serif",
                    color: '#71717A',
                    fontSize: '16px',
                    lineHeight: '24px',
                  }}>
                    Check your inbox for exclusive offers and updates.
                  </p>
                </>
              ) : (
                <>
                  {/* Heading (Figma: text-5xl Volkhov) */}
                  <h3 style={{
                    fontFamily: "'Volkhov', serif",
                    fontSize: '48px',
                    fontWeight: 400,
                    color: '#3F3F46',
                    marginBottom: '16px',
                  }}>
                    {config.newsletterHeadline || 'Subscribe To Our Newsletter'}
                  </h3>
                  {/* Subtitle */}
                  <p style={{
                    fontFamily: "'Poppins', sans-serif",
                    color: '#71717A',
                    fontSize: '16px',
                    lineHeight: '24px',
                    marginBottom: '48px',
                  }}>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Scelerisque duis ultrices sollicitudin aliquam sem. Scelerisque duis ultrices sollicitudin
                  </p>

                  {/* Email Input (Figma: white shadow box) */}
                  <form onSubmit={handleSubscribe} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '24px',
                  }}>
                    <div style={{
                      width: '631px',
                      height: '80px',
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0px 163px 80px rgba(0, 0, 0, 0.04), 0px 105px 47px rgba(0, 0, 0, 0.03), 0px 63px 25px rgba(0, 0, 0, 0.02)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 24px',
                    }}>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="michael@ymail.com"
                        required
                        style={{
                          flex: 1,
                          border: 'none',
                          outline: 'none',
                          fontFamily: "'Poppins', sans-serif",
                          fontSize: '20px',
                          fontWeight: 400,
                          color: '#71717A',
                          backgroundColor: 'transparent',
                        }}
                      />
                    </div>

                    {/* Subscribe Button (Figma: w-52 h-14 bg-black rounded-[10px]) */}
                    <button
                      type="submit"
                      style={{
                        width: '208px',
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
                      Subscribe Now
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Bar (Figma: simple row with logo + links) */}
      <div style={{
        borderTop: '1px solid #E4E4E7',
        padding: '32px 0',
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {/* FASCO Logo (Figma: text-3xl Volkhov) */}
          <h2 style={{
            fontFamily: "'Volkhov', serif",
            fontSize: '30px',
            fontWeight: 400,
            color: '#3F3F46',
            lineHeight: '32px',
          }}>
            FASCO
          </h2>

          {/* Navigation Links (Figma: text-base Poppins text-zinc-700) */}
          <div style={{
            display: 'flex',
            gap: '32px',
          }}>
            {['Support Center', 'Invoicing', 'Contract', 'Careers', 'Blog', "FAQ's"].map((item) => (
              <button
                key={item}
                onClick={() => alert(`${item} page coming soon!`)}
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '16px',
                  fontWeight: 400,
                  color: '#3F3F46',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#000000'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#3F3F46'}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Copyright (Figma: text-xs Poppins centered) */}
        <div style={{
          textAlign: 'center',
          marginTop: '32px',
        }}>
          <p style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '12px',
            fontWeight: 400,
            color: '#3F3F46',
            lineHeight: '24px',
          }}>
            Copyright © 2022 Xpro . All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
