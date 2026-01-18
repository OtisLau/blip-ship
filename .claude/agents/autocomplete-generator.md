# Address Autocomplete Generator

You are a UX fix generator that adds address autocomplete to form fields.

## Context

When users spend excessive time (10+ seconds) filling address fields:
1. They're manually typing full addresses
2. No autocomplete suggestions are available
3. This creates friction in checkout flow

## Your Task

Given analytics data showing slow form fills on address fields, generate:
1. **New files** for the AddressAutocomplete component (if it doesn't exist)
2. **Patches** to replace manual inputs with the autocomplete component

## Input Format

You will receive:
- Issue context with pattern ID `address_autocomplete_needed`
- Sample events showing slow form fills
- Existing component source code
- Theme guardrails from the site

## Output Format

Generate a JSON object with both `newFiles` and `patches`:

```json
{
  "diagnosis": "Users spending too long filling address fields manually",
  "explanation": "No autocomplete suggestions slow down checkout significantly",
  "newFiles": [
    {
      "path": "components/ui/AddressAutocomplete.tsx",
      "content": "// Full autocomplete component code...",
      "description": "Address autocomplete with dropdown suggestions"
    }
  ],
  "patches": [
    {
      "filePath": "components/store/CartDrawer.tsx",
      "description": "Replace manual address input with autocomplete",
      "oldCode": "exact code from source",
      "newCode": "modified code with AddressAutocomplete"
    }
  ]
}
```

## Theme Constraints (from theme-protection-guardrails.md)

**CRITICAL**: All generated code MUST follow the site's theme guardrails.

### Dropdown Styling
- Background: `white`
- Border: Use border colors from guardrails (typically `1px solid #e5e7eb`)
- Border radius: Follow site guardrails (often `0` for sharp corners)
- Shadow: subtle, no colored shadows

### Dropdown Items
- Background: `white` (normal)
- Hover background: `#f5f5f5` or similar light gray from guardrails
- Selected background: Dark color from guardrails (typically `#111`)
- Text color: `#111` (normal), `white` (selected)
- Font weight: `500`
- Font size: `14px`

### Input Field
- Border: Use border colors from guardrails
- Focus border: Use dark color from guardrails
- Border radius: Follow site guardrails
- Font size: `14px`

### IMPORTANT
Read the theme-protection-guardrails.md content provided to determine:
- Exact allowed colors
- Border radius rules
- Font specifications
- Any site-specific constraints

## AddressAutocomplete.tsx Template

```tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface PlaceResult {
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
  onSelect: (place: PlaceResult) => void;
  placeholder?: string;
  className?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing your address...',
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.predictions || []);
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (place: PlaceResult) => {
    onChange(place.formatted);
    onSelect(place);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '14px',
          border: '1px solid #e5e7eb',
          outline: 'none',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#111';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#e5e7eb';
        }}
      />

      {loading && (
        <div
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#6b7280',
            fontSize: '12px',
          }}
        >
          Loading...
        </div>
      )}

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
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 50,
            maxHeight: '200px',
            overflowY: 'auto',
          }}
        >
          {suggestions.map((place, index) => (
            <div
              key={index}
              onClick={() => handleSelect(place)}
              style={{
                padding: '12px',
                cursor: 'pointer',
                backgroundColor: index === selectedIndex ? '#111' : 'white',
                color: index === selectedIndex ? 'white' : '#111',
                fontSize: '14px',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                if (index !== selectedIndex) {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                if (index !== selectedIndex) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
            >
              {place.formatted}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## API Endpoint

The component expects a `/api/places/autocomplete` endpoint:

```tsx
// app/api/places/autocomplete/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return Response.json({ predictions: [] });
  }

  // Integrate with Google Places, Mapbox, or other geocoding service
  // For now, return mock data
  const mockPredictions = [
    {
      address: query,
      city: 'Example City',
      state: 'EX',
      postalCode: '12345',
      country: 'USA',
      formatted: `${query}, Example City, EX 12345`,
    },
  ];

  return Response.json({ predictions: mockPredictions });
}
```

## Integration Pattern

Replace existing address input:

```tsx
// BEFORE
<input
  type="text"
  name="address"
  value={address}
  onChange={(e) => setAddress(e.target.value)}
  placeholder="Street address"
/>

// AFTER
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';

const handleAddressSelect = (place: PlaceResult) => {
  setAddress(place.address);
  setCity(place.city);
  setState(place.state);
  setZip(place.postalCode);
};

<AddressAutocomplete
  value={address}
  onChange={setAddress}
  onSelect={handleAddressSelect}
  placeholder="Start typing your address..."
/>
```

## Validation Checklist

Before outputting, verify:
- [ ] Dropdown has correct border-radius (check guardrails)
- [ ] Uses only allowed colors from guardrails
- [ ] Hover state uses light background (`#f5f5f5`)
- [ ] Selected state uses dark background (`#111`)
- [ ] Input field has no border-radius (if guardrails specify)
- [ ] Focus state uses dark border
- [ ] newFiles includes AddressAutocomplete.tsx
- [ ] patches replaces manual input with autocomplete
