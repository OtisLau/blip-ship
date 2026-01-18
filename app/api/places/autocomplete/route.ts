/**
 * GET /api/places/autocomplete - Address autocomplete suggestions
 *
 * Proxies requests to Google Places API or provides mock data
 * for development without API key.
 */

import { NextRequest, NextResponse } from 'next/server';

interface PlaceSuggestion {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  formatted: string;
}

// Mock suggestions for development (when no API key is configured)
const MOCK_SUGGESTIONS: PlaceSuggestion[] = [
  {
    address: '123 Main Street',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
    country: 'USA',
    formatted: '123 Main Street, San Francisco, CA 94102',
  },
  {
    address: '456 Market Street',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94103',
    country: 'USA',
    formatted: '456 Market Street, San Francisco, CA 94103',
  },
  {
    address: '789 Mission Street',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
    country: 'USA',
    formatted: '789 Mission Street, San Francisco, CA 94105',
  },
  {
    address: '100 Broadway',
    city: 'New York',
    state: 'NY',
    postalCode: '10005',
    country: 'USA',
    formatted: '100 Broadway, New York, NY 10005',
  },
  {
    address: '200 Fifth Avenue',
    city: 'New York',
    state: 'NY',
    postalCode: '10010',
    country: 'USA',
    formatted: '200 Fifth Avenue, New York, NY 10010',
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;

  // If Google API key is configured, use real API
  if (googleApiKey) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=address&key=${googleApiKey}`
      );

      if (!response.ok) {
        throw new Error('Google Places API error');
      }

      const data = await response.json();

      // Transform Google Places response to our format
      const suggestions: PlaceSuggestion[] = await Promise.all(
        (data.predictions || []).slice(0, 5).map(async (prediction: { place_id: string; description: string }) => {
          // Get place details
          const detailsResponse = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=address_components&key=${googleApiKey}`
          );
          const details = await detailsResponse.json();
          const components = details.result?.address_components || [];

          const getComponent = (type: string) =>
            components.find((c: { types: string[]; long_name: string }) => c.types.includes(type))?.long_name || '';

          return {
            address: `${getComponent('street_number')} ${getComponent('route')}`.trim(),
            city: getComponent('locality') || getComponent('sublocality'),
            state: getComponent('administrative_area_level_1'),
            postalCode: getComponent('postal_code'),
            country: getComponent('country'),
            formatted: prediction.description,
          };
        })
      );

      return NextResponse.json({ suggestions });
    } catch (error) {
      console.error('Google Places API error:', error);
      // Fall through to mock data
    }
  }

  // Use mock data for development
  const lowerQuery = query.toLowerCase();
  const filteredSuggestions = MOCK_SUGGESTIONS.filter(
    (s) =>
      s.formatted.toLowerCase().includes(lowerQuery) ||
      s.address.toLowerCase().includes(lowerQuery) ||
      s.city.toLowerCase().includes(lowerQuery)
  );

  // If no matches, generate suggestions based on query
  if (filteredSuggestions.length === 0) {
    const mockSuggestion: PlaceSuggestion = {
      address: query,
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
      country: 'USA',
      formatted: `${query}, San Francisco, CA 94102`,
    };
    return NextResponse.json({ suggestions: [mockSuggestion] });
  }

  return NextResponse.json({ suggestions: filteredSuggestions });
}
