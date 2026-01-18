'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface PlaceSuggestion {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  formatted: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: PlaceSuggestion) => void;
  placeholder?: string;
  className?: string;
  name?: string;
}

/**
 * AddressAutocomplete Component
 *
 * Address input with autocomplete suggestions.
 * Follows theme-protection-guardrails.md:
 * - No border-radius (sharp corners)
 * - Allowed colors only
 * - #f5f5f5 hover, #111 selected
 */
export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing your address...',
  className = '',
  name = 'address',
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Address autocomplete error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced fetch
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, fetchSuggestions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (place: PlaceSuggestion) => {
    onChange(place.formatted);
    onSelect(place);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  return (
    <div className={className} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        style={{
          width: '100%',
          padding: '12px 14px',
          fontSize: '14px',
          fontWeight: 500,
          color: '#111',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 0,
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onBlur={(e) => {
          // Delay to allow click on suggestion
          setTimeout(() => {
            if (!dropdownRef.current?.contains(document.activeElement)) {
              setIsOpen(false);
            }
          }, 150);
        }}
      />

      {/* Loading indicator */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '16px',
            height: '16px',
            border: '2px solid #e5e7eb',
            borderTopColor: '#111',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      )}

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderTop: 'none',
            borderRadius: 0,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 50,
          }}
        >
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setHighlightedIndex(idx)}
              style={{
                width: '100%',
                padding: '12px 14px',
                textAlign: 'left',
                fontSize: '14px',
                fontWeight: 500,
                color: highlightedIndex === idx ? 'white' : '#111',
                backgroundColor: highlightedIndex === idx ? '#111' : 'white',
                border: 'none',
                borderBottom: idx < suggestions.length - 1 ? '1px solid #e5e7eb' : 'none',
                cursor: 'pointer',
                transition: 'background-color 0.1s, color 0.1s',
              }}
            >
              <div>{suggestion.address}</div>
              <div
                style={{
                  fontSize: '12px',
                  color: highlightedIndex === idx ? 'rgba(255,255,255,0.7)' : '#6b7280',
                  marginTop: '2px',
                }}
              >
                {suggestion.city}, {suggestion.state} {suggestion.postalCode}
              </div>
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: translateY(-50%) rotate(0deg); }
          to { transform: translateY(-50%) rotate(360deg); }
        }
        input:focus {
          border-color: #111;
        }
      `}</style>
    </div>
  );
}

export default AddressAutocomplete;
