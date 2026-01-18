'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react'

interface Product {
  id: string
  name: string
  price: number
  image: string
  badge?: string
  description?: string
  materials?: string
}

interface CompareContextType {
  compareItems: Product[]
  addToCompare: (product: Product) => boolean
  removeFromCompare: (id: string) => void
  isInCompare: (id: string) => boolean
  toggleCompare: (product: Product) => void
  clearCompare: () => void
  isOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
  maxItems: number
}

const CompareContext = createContext<CompareContextType | undefined>(undefined)

const MAX_COMPARE_ITEMS = 4

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareItems, setCompareItems] = useState<Product[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const addToCompare = useCallback((product: Product): boolean => {
    let added = false
    setCompareItems(prev => {
      if (prev.length >= MAX_COMPARE_ITEMS) {
        console.warn(`Compare limit reached (${MAX_COMPARE_ITEMS} items max)`)
        return prev
      }
      if (prev.find(p => p.id === product.id)) {
        return prev
      }
      added = true
      return [...prev, product]
    })
    return added
  }, [])

  const removeFromCompare = useCallback((id: string) => {
    setCompareItems(prev => prev.filter(p => p.id !== id))
  }, [])

  const isInCompare = useCallback(
    (id: string) => compareItems.some(p => p.id === id),
    [compareItems]
  )

  const toggleCompare = useCallback(
    (product: Product) => {
      if (isInCompare(product.id)) {
        removeFromCompare(product.id)
      } else {
        addToCompare(product)
      }
    },
    [isInCompare, removeFromCompare, addToCompare]
  )

  const clearCompare = useCallback(() => {
    setCompareItems([])
  }, [])

  const openDrawer = useCallback(() => setIsOpen(true), [])
  const closeDrawer = useCallback(() => setIsOpen(false), [])

  const value = useMemo(
    () => ({
      compareItems,
      addToCompare,
      removeFromCompare,
      isInCompare,
      toggleCompare,
      clearCompare,
      isOpen,
      openDrawer,
      closeDrawer,
      maxItems: MAX_COMPARE_ITEMS,
    }),
    [
      compareItems,
      addToCompare,
      removeFromCompare,
      isInCompare,
      toggleCompare,
      clearCompare,
      isOpen,
      openDrawer,
      closeDrawer,
    ]
  )

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  )
}

export function useCompare() {
  const context = useContext(CompareContext)
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider')
  }
  return context
}
