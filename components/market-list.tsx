'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Address } from '@solana/kit'
import { RefreshCw, Inbox, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { getAllMarkets, type Market } from '@/lib/solana'
import { MarketCard } from './market-card'

type MarketWithAddress = {
  address: Address
  data: Market
}

type TabValue = 'active' | 'ended' | 'all'

export function MarketList({ refreshToken }: { refreshToken?: number }) {
  const [markets, setMarkets] = useState<MarketWithAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabValue>('active')
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchMarkets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getAllMarkets()
      result.sort((a, b) => Number(b.data.endTime) - Number(a.data.endTime))
      setMarkets(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch markets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMarkets()
  }, [fetchMarkets])

  useEffect(() => {
    if (typeof refreshToken !== 'number') return

    let cancelled = false
    let attempt = 0

    const run = async () => {
      if (cancelled) return
      await fetchMarkets()
      if (cancelled || attempt >= 2) return
      attempt += 1
      refreshTimeoutRef.current = setTimeout(run, 1200 * (attempt + 1))
    }

    run()

    return () => {
      cancelled = true
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [fetchMarkets, refreshToken])

  const { activeMarkets, endedMarkets } = useMemo(() => {
    const now = Date.now()
    const active: MarketWithAddress[] = []
    const ended: MarketWithAddress[] = []

    for (const market of markets) {
      const endTime = Number(market.data.endTime) * 1000
      const isEnded = market.data.isResolved || now > endTime
      if (isEnded) {
        ended.push(market)
      } else {
        active.push(market)
      }
    }

    return { activeMarkets: active, endedMarkets: ended }
  }, [markets])

  const filteredMarkets = useMemo(() => {
    switch (activeTab) {
      case 'active':
        return activeMarkets
      case 'ended':
        return endedMarkets
      case 'all':
        return markets
    }
  }, [activeTab, activeMarkets, endedMarkets, markets])

  const tabs: { value: TabValue; label: string; count: number }[] = [
    { value: 'active', label: 'Active', count: activeMarkets.length },
    { value: 'ended', label: 'Ended', count: endedMarkets.length },
    { value: 'all', label: 'All', count: markets.length },
  ]

  if (loading && markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Spinner className="size-8 text-slate-400" />
        <p className="mt-4 text-slate-500 text-sm">Loading markets...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="size-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="size-6 text-red-500" />
        </div>
        <p className="text-slate-800 font-medium mb-1">Failed to load markets</p>
        <p className="text-slate-500 text-sm mb-4">{error}</p>
        <Button variant="outline" onClick={fetchMarkets}>
          <RefreshCw className="size-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  if (markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Inbox className="size-8 text-slate-400" />
        </div>
        <p className="text-slate-800 font-medium mb-1">No markets yet</p>
        <p className="text-slate-500 text-sm text-center text-pretty max-w-xs">
          Create the first prediction market to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                activeTab === tab.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 tabular-nums ${
                  activeTab === tab.value ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchMarkets}
          disabled={loading}
          aria-label="Refresh markets"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {filteredMarkets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="size-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <Inbox className="size-7 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium mb-1">
            No {activeTab === 'active' ? 'active' : 'ended'} markets
          </p>
          <p className="text-slate-500 text-sm">
            {activeTab === 'active'
              ? 'All markets have ended or been resolved.'
              : 'No markets have ended yet.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMarkets.map((market) => (
            <MarketCard
              key={market.address}
              address={market.address}
              market={market.data}
              onUpdate={fetchMarkets}
            />
          ))}
        </div>
      )}
    </div>
  )
}
