"use client"

import { createContext, useContext, useState } from "react"

interface MobileNavState {
  open: boolean
  setOpen: (v: boolean) => void
}

const MobileNavContext = createContext<MobileNavState>({ open: false, setOpen: () => {} })

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return <MobileNavContext.Provider value={{ open, setOpen }}>{children}</MobileNavContext.Provider>
}

export const useMobileNav = () => useContext(MobileNavContext)
