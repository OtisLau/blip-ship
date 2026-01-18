'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react'

interface FeatureToggles {
  loadingSpinner: boolean
  imageClickable: boolean
  imageGallery: boolean
  compareFeature: boolean
  colorSwatches: boolean
}

interface FeatureToggleContextType {
  features: FeatureToggles
  enhancedMode: boolean
  toggleEnhancedMode: () => void
  toggleFeature: (feature: keyof FeatureToggles) => void
  enableFeature: (feature: keyof FeatureToggles) => void
  resetToBasic: () => void
  enableAll: () => void
}

// Start with all features OFF - they get enabled as AI detects issues and generates fixes
const defaultFeatures: FeatureToggles = {
  loadingSpinner: false,
  imageClickable: false,
  imageGallery: false,
  compareFeature: false,
  colorSwatches: false,
}

const basicFeatures: FeatureToggles = {
  loadingSpinner: false,
  imageClickable: false,
  imageGallery: false,
  compareFeature: false,
  colorSwatches: false,
}

// All features enabled (for enableAll)
const allFeatures: FeatureToggles = {
  loadingSpinner: true,
  imageClickable: true,
  imageGallery: true,
  compareFeature: true,
  colorSwatches: true,
}

const FeatureToggleContext = createContext<
  FeatureToggleContextType | undefined
>(undefined)

export function FeatureToggleProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<FeatureToggles>(defaultFeatures)
  const [enhancedMode, setEnhancedMode] = useState(false)

  const toggleEnhancedMode = useCallback(() => {
    setEnhancedMode(prev => {
      const newMode = !prev
      setFeatures(newMode ? allFeatures : basicFeatures)
      console.log(
        `🔄 [Feature Toggle] ${newMode ? 'ENHANCED' : 'BASIC'} mode activated`
      )
      return newMode
    })
  }, [])

  const toggleFeature = useCallback((feature: keyof FeatureToggles) => {
    setFeatures(prev => {
      const newValue = !prev[feature]
      console.log(`🔄 [Feature Toggle] ${feature}: ${newValue ? 'ON' : 'OFF'}`)
      return { ...prev, [feature]: newValue }
    })
  }, [])

  // Enable a specific feature (called when AI fix is approved)
  const enableFeature = useCallback((feature: keyof FeatureToggles) => {
    setFeatures(prev => {
      if (prev[feature]) return prev // Already enabled
      console.log(`✨ [AI Fix Applied] ${feature}: ENABLED`)
      return { ...prev, [feature]: true }
    })
  }, [])

  const resetToBasic = useCallback(() => {
    setFeatures(basicFeatures)
    setEnhancedMode(false)
    console.log('🔄 [Feature Toggle] Reset to BASIC mode')
  }, [])

  const enableAll = useCallback(() => {
    setFeatures(allFeatures)
    setEnhancedMode(true)
    console.log('🔄 [Feature Toggle] All features ENABLED')
  }, [])

  const value = useMemo(
    () => ({
      features,
      enhancedMode,
      toggleEnhancedMode,
      toggleFeature,
      enableFeature,
      resetToBasic,
      enableAll,
    }),
    [
      features,
      enhancedMode,
      toggleEnhancedMode,
      toggleFeature,
      enableFeature,
      resetToBasic,
      enableAll,
    ]
  )

  return (
    <FeatureToggleContext.Provider value={value}>
      {children}
    </FeatureToggleContext.Provider>
  )
}

export function useFeatureToggle() {
  const context = useContext(FeatureToggleContext)
  if (!context) {
    throw new Error(
      'useFeatureToggle must be used within a FeatureToggleProvider'
    )
  }
  return context
}
