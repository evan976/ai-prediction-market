'use client'

import { getDefaultConfig } from '@solana/connector/headless'
import { AppProvider } from '@solana/connector/react'

export function Providers({ children }: { children: React.ReactNode }) {
  const config = getDefaultConfig({
    appName: 'AI Prediction Market',
  })

  return <AppProvider connectorConfig={config}>{children}</AppProvider>
}
