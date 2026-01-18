'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { SiteConfig } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import { sanitizeText, sanitizeUrl } from '@/lib/sanitize';

interface DealsSectionProps {
  config: NonNullable<SiteConfig['deals']>;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function CountdownTimer({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endDate).getTime() - new Date().getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  const timeUnits = [
    { value: timeLeft.days, label: 'Days' },
    { value: timeLeft.hours, label: 'Hr' },
    { value: timeLeft.minutes, label: 'Mins' },
    { value: timeLeft.seconds, label: 'Sec' },
  ];

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
    }}>
      {timeUnits.map((unit) => (
        <div
          key={unit.label}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Timer Box (Figma: w-20 h-20 bg-white rounded-[10px] shadow) */}
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#FFFFFF',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0px 4px 14px 1px rgba(0, 0, 0, 0.16)',
          }}>
            <span style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: '30px',
              fontWeight: 400,
              color: '#3F3F46',
              lineHeight: '32px',
            }}>
              {String(unit.value).padStart(2, '0')}
            </span>
          </div>
          {/* Label (Figma: text-2xl Poppins) */}
          <span style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '24px',
            fontWeight: 400,
            color: '#3F3F46',
            lineHeight: '28px',
            marginTop: '12px',
          }}>
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DealsSection({ config }: DealsSectionProps) {
  const { addItem } = useCart();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleAddToCart = (product: typeof config.products[0]) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    });
  };

  const goToPrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev === 1 ? 0 : prev + 1));
  };

  return (
    <section id="deals" style={{
      padding: '96px 0',
      background: 'linear-gradient(to bottom, #FFFFFF, #FAFAFA)',
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 20px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '450px 1fr',
          gap: '64px',
          alignItems: 'start',
        }}>
          {/* Left Side - Text & Timer */}
          <div>
            {/* Title (Figma: text-5xl Volkhov) */}
            <h2 style={{
              fontFamily: "'Volkhov', serif",
              fontSize: '48px',
              fontWeight: 400,
              color: '#3F3F46',
              marginBottom: '24px',
            }}>
              {sanitizeText(config.title)}
            </h2>

            {/* Subtitle (Figma: text-base Poppins text-zinc-500) */}
            <p style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: '16px',
              fontWeight: 400,
              color: '#71717A',
              lineHeight: '24px',
              marginBottom: '32px',
              maxWidth: '384px',
            }}>
              {sanitizeText(config.subtitle)}
            </p>

            {/* Buy Now Button (Figma: w-52 h-14 bg-black rounded-[10px]) */}
            <button
              onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
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
                marginBottom: '48px',
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
              Buy Now
            </button>

            {/* Hurry Text (Figma: text-3xl font-medium Poppins) */}
            <p style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: '30px',
              fontWeight: 500,
              color: '#3F3F46',
              marginBottom: '24px',
            }}>
              Hurry, Before It&apos;s Too Late!
            </p>

            {/* Countdown Timer */}
            <CountdownTimer endDate={config.endDate} />
          </div>

          {/* Right Side - Product Images */}
          <div style={{
            position: 'relative',
          }}>
            {/* Product Image Grid */}
            <div style={{
              display: 'flex',
              gap: '24px',
            }}>
              {config.products.slice(currentSlide * 2, currentSlide * 2 + 2).map((product, index) => (
                <div
                  key={product.id}
                  style={{
                    position: 'relative',
                    width: '372px',
                    height: '486px',
                    borderRadius: '0',
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHoveredId(product.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <Image
                    src={sanitizeUrl(product.image)}
                    alt={sanitizeText(product.name)}
                    fill
                    sizes="372px"
                    style={{
                      objectFit: 'cover',
                      transition: 'transform 0.3s ease',
                      transform: hoveredId === product.id ? 'scale(1.05)' : 'scale(1)',
                    }}
                  />

                  {/* Quick Add Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                    style={{
                      position: 'absolute',
                      bottom: '16px',
                      left: '16px',
                      right: '16px',
                      padding: '14px',
                      backgroundColor: '#000000',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      opacity: hoveredId === product.id ? 1 : 0,
                      transform: hoveredId === product.id ? 'translateY(0)' : 'translateY(8px)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>

            {/* 30% OFF Badge */}
            <div style={{
              position: 'absolute',
              bottom: '200px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '224px',
              height: '128px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '0 24px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
              }}>
                <span style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '16px',
                  fontWeight: 400,
                  color: '#3F3F46',
                  lineHeight: '24px',
                }}>
                  01
                </span>
                <div style={{
                  width: '28px',
                  height: '1px',
                  backgroundColor: '#3F3F46',
                }} />
                <span style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '16px',
                  fontWeight: 400,
                  color: '#3F3F46',
                  lineHeight: '24px',
                }}>
                  Spring Sale
                </span>
              </div>
              <span style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: '30px',
                fontWeight: 400,
                color: '#3F3F46',
                lineHeight: '32px',
              }}>
                30% OFF
              </span>
            </div>

            {/* Carousel Navigation (Figma: w-12 h-12 rounded-full) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginTop: '32px',
            }}>
              {/* Carousel Dots */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
              }}>
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
                    onClick={() => setCurrentSlide(index % 2)}
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: index === currentSlide ? '#000000' : '#A1A1AA',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  />
                ))}
              </div>

              {/* Navigation Arrows */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginLeft: 'auto',
              }}>
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
                  }}
                >
                  <svg width="6" height="14" viewBox="0 0 6 14" fill="none">
                    <path d="M5 1L1 7L5 13" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  onClick={goToNext}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '10px',
                    backgroundColor: '#000000',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0px 20px 35px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                    <path d="M1 8H19M19 8L12 1M19 8L12 15" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
