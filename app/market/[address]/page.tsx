'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useWallet, useAccount } from '@solana/connector/react'
import type { Address } from '@solana/kit'
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Coins,
  Share2,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
  XCircle,
} from 'lucide-react'
import { Area, AreaChart, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { useBet, useClaim, useResolveMarket } from '@/lib/hooks'
import { getMarket, lamportsToSol, type Market } from '@/lib/solana'

type TimeRange = '1H' | '6H' | '1D' | '1W' | '1M' | 'ALL'

const chartConfig = {
  yes: {
    label: 'Yes',
    color: 'var(--color-emerald-500)',
  },
  no: {
    label: 'No',
    color: 'var(--color-red-500)',
  },
} satisfies ChartConfig

function generateMockChartData(market: Market, range: TimeRange) {
  const now = Date.now()
  const endTime = Number(market.endTime) * 1000
  const startTime = Number(market.endTime) * 1000 - 7 * 24 * 60 * 60 * 1000

  const rangeMs: Record<TimeRange, number> = {
    '1H': 60 * 60 * 1000,
    '6H': 6 * 60 * 60 * 1000,
    '1D': 24 * 60 * 60 * 1000,
    '1W': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
    ALL: now - startTime,
  }

  const duration = rangeMs[range]
  const dataPoints = range === '1H' ? 12 : range === '6H' ? 24 : 30
  const interval = duration / dataPoints

  const yesPool = lamportsToSol(market.yesPool)
  const noPool = lamportsToSol(market.noPool)
  const totalPool = yesPool + noPool
  const currentYesOdds = totalPool > 0 ? (noPool / totalPool) * 100 : 50

  const data = []
  for (let i = 0; i < dataPoints; i++) {
    const time = now - duration + i * interval
    const progress = i / dataPoints
    const baseYes = 50 + (currentYesOdds - 50) * progress
    const noise = (Math.random() - 0.5) * 10
    const yesOdds = Math.max(1, Math.min(99, baseYes + noise * (1 - progress)))

    data.push({
      time,
      date: new Date(time).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      yes: Math.round(yesOdds),
      no: Math.round(100 - yesOdds),
    })
  }

  data.push({
    time: now,
    date: 'Now',
    yes: Math.round(currentYesOdds),
    no: Math.round(100 - currentYesOdds),
  })

  return data
}

export default function MarketDetailPage({
  params,
}: {
  params: Promise<{ address: string }>
}) {
  const { address } = use(params)
  const [market, setMarket] = useState<Market | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>('1W')
  const [betAmount, setBetAmount] = useState('0.1')
  const [betSide, setBetSide] = useState<'yes' | 'no'>('yes')

  const { isConnected } = useWallet()
  const { address: accountAddress } = useAccount()
  const { placeBet, status: betStatus, error: betError } = useBet()
  const {
    resolveMarket,
    status: resolveStatus,
    error: resolveError,
  } = useResolveMarket()
  const { claim, status: claimStatus, error: claimError } = useClaim()

  const fetchMarket = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getMarket(address as Address)
      setMarket(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market')
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    fetchMarket()
  }, [fetchMarket])

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Spinner className="size-8 text-slate-400" />
      </div>
    )
  }

  if (error || !market) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error || 'Market not found'}</p>
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="size-4 mr-2" />
            Back to Markets
          </Link>
        </Button>
      </div>
    )
  }

  const yesPool = lamportsToSol(market.yesPool)
  const noPool = lamportsToSol(market.noPool)
  const totalPool = yesPool + noPool
  const yesOdds = totalPool > 0 ? (noPool / totalPool) * 100 : 50
  const noOdds = totalPool > 0 ? (yesPool / totalPool) * 100 : 50

  const endTime = new Date(Number(market.endTime) * 1000)
  const isExpired = Date.now() > endTime.getTime()
  const isResolved = market.isResolved
  const outcome =
    market.outcome === 0 ? 'yes' : market.outcome === 1 ? 'no' : null
  const isCreator = accountAddress === market.creator

  const isBetting = betStatus === 'signing' || betStatus === 'confirming'
  const isResolving =
    resolveStatus === 'signing' || resolveStatus === 'confirming'
  const isClaiming = claimStatus === 'signing' || claimStatus === 'confirming'

  const chartData = generateMockChartData(market, timeRange)

  const formatTimeRemaining = () => {
    if (isExpired) return 'Expired'
    const diff = endTime.getTime() - Date.now()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (days > 0) return `${days}d ${hours}h remaining`
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m remaining`
  }

  const handleBet = async () => {
    const amount = Number.parseFloat(betAmount) || 0.1
    const success = await placeBet(address as Address, betSide, amount)
    if (success) fetchMarket()
  }

  const handleResolve = async (result: 'yes' | 'no') => {
    const success = await resolveMarket(address as Address, result)
    if (success) fetchMarket()
  }

  const handleClaim = async () => {
    const success = await claim(address as Address)
    if (success) fetchMarket()
  }

  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`

  const yesCost = (100 - yesOdds).toFixed(1)
  const noCost = (100 - noOdds).toFixed(1)

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="size-4 mr-2" />
              Back
            </Link>
          </Button>
          <Button variant="ghost" size="icon" aria-label="Share">
            <Share2 className="size-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Market Header */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <TrendingUp className="size-6 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-semibold text-slate-900 text-balance">
                      {market.question}
                    </h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {isResolved ? 'Resolved' : formatTimeRemaining()}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="size-3.5" />
                        {shortAddress}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant={
                      isResolved ? 'default' : isExpired ? 'secondary' : 'outline'
                    }
                  >
                    {isResolved
                      ? outcome === 'yes'
                        ? 'Resolved Yes'
                        : 'Resolved No'
                      : isExpired
                        ? 'Pending'
                        : 'Active'}
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Chart */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-slate-600">Yes {yesOdds.toFixed(0)}%</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-red-500" />
                      <span className="text-slate-600">No {noOdds.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {(['1H', '6H', '1D', '1W', '1M', 'ALL'] as TimeRange[]).map(
                      (range) => (
                        <button
                          key={range}
                          onClick={() => setTimeRange(range)}
                          className={`px-2 py-1 text-xs rounded ${
                            timeRange === range
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {range}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="fillYes" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="var(--color-emerald-500)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-emerald-500)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient id="fillNo" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="var(--color-red-500)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-red-500)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      fontSize={11}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      fontSize={11}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) => value}
                          formatter={(value, name) => (
                            <span className="font-medium">
                              {name === 'yes' ? 'Yes' : 'No'}: {value}%
                            </span>
                          )}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="yes"
                      stroke="var(--color-emerald-500)"
                      strokeWidth={2}
                      fill="url(#fillYes)"
                    />
                    <Area
                      type="monotone"
                      dataKey="no"
                      stroke="var(--color-red-500)"
                      strokeWidth={2}
                      fill="url(#fillNo)"
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Pool Stats */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Coins className="size-5 text-slate-400" />
                    <span className="font-medium text-slate-700">
                      Total Volume
                    </span>
                  </div>
                  <span className="text-lg font-semibold tabular-nums">
                    {totalPool.toFixed(4)} SOL
                  </span>
                </div>
                <Separator className="my-4" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-emerald-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                        <TrendingUp className="size-4" />
                        Yes Pool
                      </span>
                      <span className="font-semibold text-emerald-700 tabular-nums">
                        {yesOdds.toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-sm text-emerald-600 tabular-nums">
                      {yesPool.toFixed(4)} SOL
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 text-red-700 font-medium">
                        <TrendingDown className="size-4" />
                        No Pool
                      </span>
                      <span className="font-semibold text-red-700 tabular-nums">
                        {noOdds.toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-sm text-red-600 tabular-nums">
                      {noPool.toFixed(4)} SOL
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Trading Panel */}
          <div className="space-y-4">
            <Card className="sticky top-20">
              <CardHeader className="pb-4">
                <h2 className="font-semibold text-slate-900">
                  {isResolved
                    ? outcome === 'yes'
                      ? 'Outcome: Yes'
                      : 'Outcome: No'
                    : 'Place Your Bet'}
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isResolved && !isExpired && (
                  <>
                    {/* Buy/Sell Toggle */}
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                      <button
                        className="flex-1 py-2 text-sm font-medium rounded-md bg-white shadow-sm"
                        disabled
                      >
                        Buy
                      </button>
                      <button
                        className="flex-1 py-2 text-sm font-medium rounded-md text-slate-500"
                        disabled
                      >
                        Sell
                      </button>
                    </div>

                    {/* Outcome Selection */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setBetSide('yes')}
                        className={`p-3 rounded-lg border-2 text-left ${
                          betSide === 'yes'
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-emerald-700">Yes</span>
                          <span className="text-sm text-slate-500 tabular-nums">
                            {yesCost}¢
                          </span>
                        </div>
                      </button>
                      <button
                        onClick={() => setBetSide('no')}
                        className={`p-3 rounded-lg border-2 text-left ${
                          betSide === 'no'
                            ? 'border-red-500 bg-red-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-red-700">No</span>
                          <span className="text-sm text-slate-500 tabular-nums">
                            {noCost}¢
                          </span>
                        </div>
                      </button>
                    </div>

                    {/* Amount Input */}
                    <div>
                      <label className="text-sm text-slate-600 mb-2 block">
                        Amount (SOL)
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="0.01"
                          step="0.1"
                          value={betAmount}
                          onChange={(e) => setBetAmount(e.target.value)}
                          disabled={isBetting || !isConnected}
                          className="flex-1"
                        />
                      </div>
                      <div className="flex gap-2 mt-2">
                        {['0.1', '0.5', '1', 'Max'].map((amount) => (
                          <button
                            key={amount}
                            onClick={() =>
                              amount !== 'Max' && setBetAmount(amount)
                            }
                            className="flex-1 py-1 text-xs rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                          >
                            {amount === 'Max' ? amount : `${amount}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Trade Button */}
                    {isConnected ? (
                      <Button
                        className={`w-full ${
                          betSide === 'yes'
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                        onClick={handleBet}
                        disabled={isBetting}
                      >
                        {isBetting ? (
                          <>
                            <Spinner className="size-4 mr-2" />
                            {betStatus === 'signing'
                              ? 'Signing...'
                              : 'Confirming...'}
                          </>
                        ) : (
                          `Buy ${betSide === 'yes' ? 'Yes' : 'No'}`
                        )}
                      </Button>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-2">
                        Connect wallet to trade
                      </p>
                    )}

                    {betError && (
                      <p className="text-sm text-red-600 bg-red-50 rounded-lg py-2 px-3">
                        {betError}
                      </p>
                    )}
                  </>
                )}

                {/* Resolve Section */}
                {!isResolved && isExpired && isCreator && isConnected && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">
                      As the market creator, you can resolve this market.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleResolve('yes')}
                        disabled={isResolving}
                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      >
                        {isResolving ? (
                          <Spinner className="size-4" />
                        ) : (
                          <>
                            <CheckCircle className="size-4 mr-2" />
                            Yes
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleResolve('no')}
                        disabled={isResolving}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        {isResolving ? (
                          <Spinner className="size-4" />
                        ) : (
                          <>
                            <XCircle className="size-4 mr-2" />
                            No
                          </>
                        )}
                      </Button>
                    </div>
                    {resolveError && (
                      <p className="text-sm text-red-600 bg-red-50 rounded-lg py-2 px-3">
                        {resolveError}
                      </p>
                    )}
                  </div>
                )}

                {/* Claim Section */}
                {isResolved && isConnected && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2 py-4">
                      {outcome === 'yes' ? (
                        <CheckCircle className="size-8 text-emerald-500" />
                      ) : (
                        <XCircle className="size-8 text-red-500" />
                      )}
                      <span className="text-lg font-semibold">
                        {outcome === 'yes' ? 'Yes Won' : 'No Won'}
                      </span>
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleClaim}
                      disabled={isClaiming}
                    >
                      {isClaiming ? (
                        <>
                          <Spinner className="size-4 mr-2" />
                          Claiming...
                        </>
                      ) : (
                        <>
                          <Trophy className="size-4 mr-2" />
                          Claim Winnings
                        </>
                      )}
                    </Button>
                    {claimError && (
                      <p className="text-sm text-red-600 bg-red-50 rounded-lg py-2 px-3">
                        {claimError}
                      </p>
                    )}
                  </div>
                )}

                {!isConnected && (isExpired || isResolved) && (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Connect wallet to interact
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
