"use client"

// Lightweight wallet connection for the dashboard. Talks to the injected
// EIP-1193 provider (MetaMask/Rabby/etc.) directly — no web3 libraries needed.

import { createContext, useCallback, useContext, useEffect, useState } from "react"

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (...args: any[]) => void) => void
  removeListener?: (event: string, handler: (...args: any[]) => void) => void
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider
  }
}

interface WalletState {
  address: string | null
  chainId: number | null
  connecting: boolean
  hasProvider: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletState | null>(null)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [hasProvider, setHasProvider] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const eth = window.ethereum
    setHasProvider(Boolean(eth))
    if (!eth) return

    // Restore an already-authorized account + current chain without prompting.
    eth.request({ method: "eth_accounts" })
      .then((accs) => {
        const a = (accs as string[])?.[0]
        if (a) setAddress(a.toLowerCase())
      })
      .catch(() => {})
    eth.request({ method: "eth_chainId" })
      .then((id) => setChainId(parseInt(id as string, 16) || null))
      .catch(() => {})

    const onAccounts = (accs: string[]) => setAddress(accs?.[0]?.toLowerCase() ?? null)
    const onChain = (id: string) => setChainId(parseInt(id, 16) || null)
    eth.on?.("accountsChanged", onAccounts)
    eth.on?.("chainChanged", onChain)
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts)
      eth.removeListener?.("chainChanged", onChain)
    }
  }, [])

  const connect = useCallback(async () => {
    const eth = window.ethereum
    if (!eth) {
      setError("No wallet detected. Install MetaMask or Rabby.")
      return
    }
    setConnecting(true)
    setError(null)
    try {
      const accs = (await eth.request({ method: "eth_requestAccounts" })) as string[]
      setAddress(accs?.[0]?.toLowerCase() ?? null)
      try {
        const id = (await eth.request({ method: "eth_chainId" })) as string
        setChainId(parseInt(id, 16) || null)
      } catch {
        /* ignore */
      }
    } catch (e) {
      setError((e as Error).message || "Connection rejected")
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => { setAddress(null); setChainId(null) }, [])

  return (
    <WalletContext.Provider value={{ address, chainId, connecting, hasProvider, error, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider")
  return ctx
}
