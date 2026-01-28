'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount, useWallet } from '@solana/connector/react'
import type { Address } from '@solana/kit'
import {
  CheckCircle,
  Clock,
  Coins,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useBet, useClaim, useResolveMarket } from '@/lib/hooks'
import {
  type BetRecord,
  getBetRecord,
  lamportsToSol,
  type Market,
} from '@/lib/solana'

type MarketCardProps = {
  address: Address
  market: Market
  onUpdate?: () => void
}

export function MarketCard({ address, market, onUpdate }: MarketCardProps) {
  const { isConnected } = useWallet()
  const { address: accountAddress } = useAccount()
  const { placeBet, status: betStatus, error: betError } = useBet()
  const {
    resolveMarket,
    status: resolveStatus,
    error: resolveError,
  } = useResolveMarket()
  const { claim, status: claimStatus, error: claimError } = useClaim()
  const [betAmount, setBetAmount] = useState('0.01')
  const [betRecord, setBetRecord] = useState<BetRecord | null>(null)
  const [betRecordLoading, setBetRecordLoading] = useState(false)
  const claimRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  const yesPool = lamportsToSol(market.yesPool)
  const noPool = lamportsToSol(market.noPool)
  const totalPool = yesPool + noPool

  const yesOdds = totalPool > 0 ? (yesPool / totalPool) * 100 : 50
  const noOdds = totalPool > 0 ? (noPool / totalPool) * 100 : 50

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
  const canResolve = isCreator && isConnected && !isResolved
  const showEarlyResolveHint = canResolve && !isExpired

  const loadBetRecord = useCallback(async () => {
    if (!isConnected || !accountAddress) {
      setBetRecord(null)
      return
    }

    setBetRecordLoading(true)
    try {
      const record = await getBetRecord(address, accountAddress as Address)
      setBetRecord(record)
    } catch {
      setBetRecord(null)
    } finally {
      setBetRecordLoading(false)
    }
  }, [accountAddress, address, isConnected])

  useEffect(() => {
    loadBetRecord()
  }, [loadBetRecord])

  useEffect(() => {
    return () => {
      if (claimRefreshTimeoutRef.current) {
        clearTimeout(claimRefreshTimeoutRef.current)
      }
    }
  }, [])

  const handleBet = async (side: 'yes' | 'no') => {
    const amount = Number.parseFloat(betAmount) || 0.01
    const success = await placeBet(address, side, amount)
    if (success) onUpdate?.()
  }

  const handleResolve = async (result: 'yes' | 'no') => {
    const success = await resolveMarket(address, result)
    if (success) onUpdate?.()
  }

  const handleClaim = async () => {
    const success = await claim(address)
    if (success) {
      await loadBetRecord()
      onUpdate?.()
      if (claimRefreshTimeoutRef.current) {
        clearTimeout(claimRefreshTimeoutRef.current)
      }
      claimRefreshTimeoutRef.current = setTimeout(() => {
        onUpdate?.()
      }, 1200)
    }
  }

  const formatTimeRemaining = () => {
    if (isExpired) return 'Expired'
    const diff = endTime.getTime() - Date.now()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }
    return `${hours}h ${minutes}m`
  }

  const shortAddress = `${address.slice(0, 4)}...${address.slice(-4)}`
  const winningAmount =
    isResolved && betRecord
      ? outcome === 'yes'
        ? betRecord.yesAmount
        : outcome === 'no'
          ? betRecord.noAmount
          : 0n
      : 0n
  const hasWinnings = winningAmount > 0n
  const alreadyClaimed = betRecord?.claimed ?? false

  return (
    <Link href={`/market/${address}`} className="block h-full">
      <Card className="h-full flex flex-col hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-base leading-snug text-slate-800 line-clamp-2 text-pretty">
              {market.question}
            </h3>
            <Badge
              variant={
                isResolved ? 'default' : isExpired ? 'secondary' : 'outline'
              }
              className="shrink-0"
            >
              {isResolved ? (
                outcome === 'yes' ? (
                  <>
                    <CheckCircle className="size-3 mr-1" /> Yes
                  </>
                ) : (
                  <>
                    <XCircle className="size-3 mr-1" /> No
                  </>
                )
              ) : isExpired ? (
                'Pending'
              ) : (
                'Active'
              )}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {isResolved ? 'Resolved' : formatTimeRemaining()}
            </span>
            <span className="flex items-center gap-1">
              <User className="size-3" />
              {shortAddress}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pb-4 flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-emerald-50 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-emerald-700 font-medium text-sm">
                  <TrendingUp className="size-4" />
                  Yes
                </span>
                <span className="font-semibold text-emerald-700 tabular-nums">
                  {yesOdds.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 bg-emerald-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${yesOdds}%` }}
                />
              </div>
              <p className="text-xs text-emerald-600 mt-1.5 tabular-nums">
                {yesPool.toFixed(4)} SOL
              </p>
            </div>

            <div className="rounded-lg bg-red-50 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-red-700 font-medium text-sm">
                  <TrendingDown className="size-4" />
                  No
                </span>
                <span className="font-semibold text-red-700 tabular-nums">
                  {noOdds.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 bg-red-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: `${noOdds}%` }}
                />
              </div>
              <p className="text-xs text-red-600 mt-1.5 tabular-nums">
                {noPool.toFixed(4)} SOL
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-50">
            <Coins className="size-4 text-slate-400" />
            <span className="text-sm text-slate-600">
              Total:{' '}
              <span className="font-medium text-slate-800 tabular-nums">
                {totalPool.toFixed(4)} SOL
              </span>
            </span>
          </div>

          {!isResolved && !isExpired && isConnected && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 shrink-0">Amount:</span>
              <Input
                type="number"
                min="0.001"
                step="0.01"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="h-8 text-sm"
                disabled={isBetting}
              />
              <span className="text-xs text-slate-500 shrink-0">SOL</span>
            </div>
          )}

          {(betError || resolveError || claimError) && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg py-2 px-3">
              {betError || resolveError || claimError}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-0">
          {!isResolved && !isExpired && isConnected && (
            <div className="flex gap-2 w-full">
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  handleBet('yes')
                }}
                disabled={isBetting}
              >
                {isBetting ? <Spinner className="size-4" /> : 'Bet Yes'}
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  handleBet('no')
                }}
                disabled={isBetting}
              >
                {isBetting ? <Spinner className="size-4" /> : 'Bet No'}
              </Button>
            </div>
          )}

          {canResolve && (
            <>
              {showEarlyResolveHint && (
                <p className="text-xs text-amber-600 text-center">
                  Creator can end the market early
                </p>
              )}
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    handleResolve('yes')
                  }}
                  disabled={isResolving}
                >
                  {isResolving ? <Spinner className="size-4" /> : 'Resolve Yes'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    handleResolve('no')
                  }}
                  disabled={isResolving}
                >
                  {isResolving ? <Spinner className="size-4" /> : 'Resolve No'}
                </Button>
              </div>
            </>
          )}

          {isResolved && isConnected && hasWinnings && !alreadyClaimed && (
            <Button
              className="w-full"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                handleClaim()
              }}
              disabled={isClaiming || betRecordLoading}
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
          )}

          {isResolved && isConnected && (!hasWinnings || alreadyClaimed) && (
            <p className="text-xs text-slate-500 text-center py-2">
              {betRecordLoading
                ? 'Checking claim status...'
                : alreadyClaimed
                  ? 'Already claimed'
                  : 'No winnings to claim'}
            </p>
          )}

          {!isConnected && (
            <p className="text-sm text-slate-500 text-center py-2">
              Connect wallet to participate
            </p>
          )}
        </CardFooter>
      </Card>
    </Link>
  )
}
