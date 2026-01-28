import { NextResponse } from 'next/server'
import { placeBet } from '@/lib/markets'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = (await request.json()) as {
      side?: 'yes' | 'no'
      bettor?: string
    }

    if (body.side !== 'yes' && body.side !== 'no') {
      return NextResponse.json(
        { error: 'Side must be yes or no.' },
        { status: 400 },
      )
    }

    const market = await placeBet({ id, side: body.side, bettor: body.bettor })
    return NextResponse.json({ market })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to place bet.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
