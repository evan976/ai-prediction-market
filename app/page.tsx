'use client'

import { useState } from 'react'
import { Shield, TrendingUp, Zap } from 'lucide-react'
import { ConnectButton } from '@/components/connect-button'
import { CreateMarketDialog } from '@/components/create-market-dialog'
import { MarketList } from '@/components/market-list'

export default function Home() {
  const [refreshToken, setRefreshToken] = useState(0)

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <TrendingUp className="size-4 text-white" />
            </div>
            <span className="text-lg font-bold">Predict</span>
          </div>
          <div className="flex items-center gap-3">
            <CreateMarketDialog
              onSuccess={() => setRefreshToken((value) => value + 1)}
            />
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <section className="text-center py-12 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-medium mb-4">
            <Zap className="size-3.5" />
            Powered by Solana
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
            Prediction Markets
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 text-pretty">
            Bet on the outcome of future events. Create markets, place bets, and
            claim your winnings on-chain.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="size-4 text-emerald-600" />
              </div>
              <span>Decentralized</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Zap className="size-4 text-blue-600" />
              </div>
              <span>Instant Settlement</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Shield className="size-4 text-amber-600" />
              </div>
              <span>Trustless</span>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Markets</h2>
          </div>
          <MarketList refreshToken={refreshToken} />
        </section>
      </main>

      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          Built on Solana. Trade at your own risk.
        </div>
      </footer>
    </div>
  )
}
