'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface ProductGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  productName: string;
  initialIndex?: number;
}

/**
 * ProductGallery Component
 *
 * A lightbox gallery for viewing product images.
 * Follows theme-protection-guardrails.md:
 * - Dark overlay (#111 with opacity)
 * - No border-radius (sharp corners)
 * - White controls on dark background
 */
export function ProductGallery({
  isOpen,
  onClose,
  images,
  productName,
  initialIndex = 0,
}: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  // Reset index when gallery opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
    }
  }, [isOpen, initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setIsZoomed(false);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setIsZoomed(false);
  }, [images.length]);

  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(17, 17, 17, 0.95)',
      }}
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          width: '44px',
          height: '44px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: 500,
          opacity: 0.8,
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; }}
        aria-label="Close gallery"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Image Counter */}
      {images.length > 1 && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            color: '#6b7280',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Product Name */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          fontSize: '14px',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {productName}
      </div>

      {/* Previous Button */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
          style={{
            position: 'absolute',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '44px',
            height: '44px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            opacity: 0.8,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; }}
          aria-label="Previous image"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}

      {/* Next Button */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goToNext(); }}
          style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '44px',
            height: '44px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            opacity: 0.8,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; }}
          aria-label="Next image"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      {/* Main Image */}
      <div
        onClick={(e) => { e.stopPropagation(); toggleZoom(); }}
        style={{
          position: 'relative',
          width: isZoomed ? '90vw' : '70vw',
          height: isZoomed ? '90vh' : '70vh',
          maxWidth: '1200px',
          transition: 'all 0.3s ease',
          cursor: isZoomed ? 'zoom-out' : 'zoom-in',
        }}
      >
        <Image
          src={images[currentIndex]}
          alt={`${productName} - Image ${currentIndex + 1}`}
          fill
          style={{
            objectFit: 'contain',
          }}
          priority
        />
      </div>

      {/* Thumbnail Strip (for multiple images) */}
      {images.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
          }}
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); setIsZoomed(false); }}
              style={{
                width: '48px',
                height: '48px',
                padding: 0,
                border: idx === currentIndex ? '2px solid white' : '1px solid #6b7280',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                opacity: idx === currentIndex ? 1 : 0.6,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { if (idx !== currentIndex) e.currentTarget.style.opacity = '0.6'; }}
            >
              <Image
                src={img}
                alt={`Thumbnail ${idx + 1}`}
                fill
                style={{ objectFit: 'cover' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductGallery;
