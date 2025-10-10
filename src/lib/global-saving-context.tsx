import { createContext, useContext, useState, ReactNode } from 'react'

// Global saving state context to prevent concurrent saves across all calendar components
const GlobalSavingContext = createContext<{
  isSaving: boolean
  setIsSaving: (saving: boolean) => void
}>({
  isSaving: false,
  setIsSaving: () => {},
})

export const GlobalSavingProvider = ({ children }: { children: ReactNode }) => {
  const [isSaving, setIsSaving] = useState(false)

  return (
    <GlobalSavingContext.Provider value={{ isSaving, setIsSaving }}>
      {children}
    </GlobalSavingContext.Provider>
  )
}

export const useGlobalSaving = () => useContext(GlobalSavingContext)
export default GlobalSavingContext
