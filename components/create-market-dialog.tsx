'use client'

import { useState } from 'react'
import { useWallet } from '@solana/connector/react'
import { Clock, HelpCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useCreateMarket } from '@/lib/hooks'

export function CreateMarketDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [hours, setHours] = useState('24')
  const { isConnected } = useWallet()
  const { createMarket, status, error } = useCreateMarket()

  const isLoading = status === 'signing' || status === 'confirming'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return

    const hoursNum = Math.max(
      1,
      Math.min(168, Number.parseInt(hours, 10) || 24),
    )
    const endTime = Math.floor(Date.now() / 1000) + hoursNum * 60 * 60

    const result = await createMarket(question.trim(), endTime)
    if (result) {
      setQuestion('')
      setHours('24')
      setOpen(false)
      onSuccess?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!isConnected}>
          <Plus className="size-4 mr-2" />
          Create Market
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Prediction Market</DialogTitle>
            <DialogDescription>
              Ask a yes/no question for others to bet on.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question" className="flex items-center gap-2">
                <HelpCircle className="size-4 text-slate-400" />
                Question
              </Label>
              <Input
                id="question"
                placeholder="Will SOL reach $125 by end of the day?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={200}
                disabled={isLoading}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Make it clear and verifiable, like "Will SOL reach $125 by end
                  of the day?"
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {question.length}/200
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours" className="flex items-center gap-2">
                <Clock className="size-4 text-slate-400" />
                Duration
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="hours"
                  type="number"
                  min={1}
                  max={168}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  disabled={isLoading}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">hours</span>
                <div className="flex-1" />
                <div className="flex gap-1">
                  {[6, 24, 48, 168].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHours(String(h))}
                      className={`px-2 py-1 text-xs rounded-md ${
                        hours === String(h)
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {h === 168 ? '7d' : h === 48 ? '2d' : `${h}h`}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Market expires in {hours} hours (max 7 days)
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-red-50 rounded-lg py-2 px-3">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !question.trim()}>
              {isLoading ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  {status === 'signing' ? 'Signing...' : 'Confirming...'}
                </>
              ) : (
                'Create Market'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
