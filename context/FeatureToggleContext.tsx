'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface Features {
  compareFeature: boolean;
  quickView: boolean;
  wishlist: boolean;
}

interface FeatureToggleContextType {
  features: Features;
  toggleFeature: (feature: keyof Features) => void;
  setFeature: (feature: keyof Features, enabled: boolean) => void;
}

const defaultFeatures: Features = {
  compareFeature: true,
  quickView: true,
  wishlist: false,
};

const FeatureToggleContext = createContext<FeatureToggleContextType | undefined>(undefined);

export function FeatureToggleProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<Features>(defaultFeatures);

  const toggleFeature = (feature: keyof Features) => {
    setFeatures((prev) => ({
      ...prev,
      [feature]: !prev[feature],
    }));
  };

  const setFeature = (feature: keyof Features, enabled: boolean) => {
    setFeatures((prev) => ({
      ...prev,
      [feature]: enabled,
    }));
  };

  return (
    <FeatureToggleContext.Provider value={{ features, toggleFeature, setFeature }}>
      {children}
    </FeatureToggleContext.Provider>
  );
}

export function useFeatureToggle() {
  const context = useContext(FeatureToggleContext);
  if (context === undefined) {
    throw new Error('useFeatureToggle must be used within a FeatureToggleProvider');
  }
  return context;
}
